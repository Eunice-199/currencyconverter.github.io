/*********************************************************
 * Author: Ogunrinde Eunice Modupe
 *
 * ALC Offline first Currency Converter Services Worker
 **********************************************************/

'use strict';

$(document).ready(function() {
    fetchAllCurrencies();
});

/*
SERVICE WORKER SECTION
*/
// initial  page and register services worker
if (navigator.serviceWorker) {
    // registering the services worker
    registerServiceWorker();

    // listening for controller change
    navigator.serviceWorker.addEventListener('controllerchange', function() {
        window.location.reload();
    });

} else {
    console.log('browser does not support Services Worker !');
}

// register service worker
function registerServiceWorker() {
    // register the service worker
    navigator.serviceWorker.register('sw.js').then(function(sw) {
        // check service worker controller
        if (!navigator.serviceWorker.controller) return;

        // on waiting state
        if (sw.waiting) {
            // updateIsReady(sw.waiting);
            sw.postMessage('message', { action: 'skipWaiting' });
            return;
        }

        // on installing state
        if (sw.installing) {
            trackInstalling(sw.installing);
        }

        // on updated found
        sw.addEventListener('updatefound', function() {
            trackInstalling(sw.installing);
        });
    });
}

// track service worker state
function trackInstalling(worker) {
    worker.addEventListener('statechange', function() {
        if (worker.state == 'installed') {
            updateIsReady(worker);
        }
    });
}

// update app 
function updateIsReady(sw) {
    // console.log('a new SW is ready to take over !');
    // sw.postMessage('message', {action: 'skipWaiting'});
    pushUpdateFound();
}

// push updates
function pushUpdateFound() {
    $(".notify").fadeIn();
    console.log('sw found some updates.. !');
}



/* INDEXED DB SECTION*/

if (!window.indexedDB) {
    console.log("Your browser doesn't support a stable version of IndexedDB");
}

// open database 
function openDatabase() {
    // return db instances
    const DB_NAME = 'currencyConverter';
    const database = indexedDB.open(DB_NAME, 1);

    // on error catch errors 
    database.onerror = (event) => {
        console.log('error opening web database');
        return false;
    };

    // checking the db version
    database.onupgradeneeded = function(event) {
        // listen for the event response
        var upgradeDB = event.target.result;

        // create an objectStore for this database
        var objectStore = upgradeDB.createObjectStore("currencies");
    };

    // return db instance
    return database;
}

// save to currencies object
function saveToDatabase(data) {
    // init database
    const db = openDatabase();

    // on success add user
    db.onsuccess = (event) => {

        // console.log('database has been openned !');
        const query = event.target.result;

        // check if already exist symbol
        const currency = query.transaction("currencies").objectStore("currencies").get(data.symbol);

        // wait for users to arrive
        currency.onsuccess = (event) => {
            const dbData = event.target.result;
            const store = query.transaction("currencies", "readwrite").objectStore("currencies");

            if (!dbData) {
                // save data into currency object
                store.add(data, data.symbol);
            } else {
                // update data existing currency object
                store.put(data, data.symbol);
            };
        }
    }
}

// fetch from web database
function fetchFromDatabase(symbol, amount) {
    // init database
    const db = openDatabase();

    // on success add user
    db.onsuccess = (event) => {

        // console.log('database has been openned !');
        const query = event.target.result;

        // check if already exist symbol
        const currency = query.transaction("currencies").objectStore("currencies").get(symbol);

        // wait for users to arrive
        currency.onsuccess = (event) => {
            const data = event.target.result;
            // console.log(data);
            if (data == null) {
                $(".error_msg").append(`
					<div class="card-feel">
		                <span class="text-danger">
		                	You are currently offline... check internet connectivity and try again.
		                </span>
					</div>
				`);

                // hide error message
                setTimeout((e) => {
                    $(".error_msg").html("");
                }, 1000 * 3);

                // void
                return;
            }

            // console.log(data);
            // console.log(data);
            let pairs = symbol.split('_');
            let fr = pairs[0];
            let to = pairs[1];

            $(".results").append(`
				<div class="card-feel">
	                <h1 class="small text-center"> <b>${amount}</b> <b>${fr}</b> & <b>${to}</b> converted successfully !</h1>
					<hr />
					Exchange rate for <b>${amount}</b> <b>${fr}</b> to <b>${to}</b> is: <br /> 
					<b>${numeral(amount * data.value).format('0.000')}</b>
				</div>
			`);
        }
    }
}

/*API SECTION*/

// fetch all currencies 
const fetchAllCurrencies = (e) => {
    // used es6 Arrow func here..
    $.get('https://free.currencyconverterapi.com/api/v5/currencies', (data) => {
        // if data not fetch
        if (!data) console.log("Could not fetch any data");

        // convert pairs to array
        const pairs = objectArray(data.results);

        // used for of loop
        for (let val of pairs) {
            // using template leteral
            $("#curr-from").append(`
				<option value="${val.id}">${val.id} (${val.currencyName})</option>
			`);
            $("#curr-to").append(`
				<option value="${val.id}">${val.id} (${val.currencyName})</option>
			`);
        }
    });
}



// convert currencies 
function convertACurrency() {
    let from = $("#curr-from").val();
    let to = $("#curr-to").val();
    let amount = $("#convert-amount").val();

    //add event listener on Convet Button
    document.getElementById('convert-btn').addEventListener('click', () => {
        $(".output-results").hide();
    });

    // restrict the users for converting  the same currency
    if (from == to) {
        // console.log('error ');
        $(".error_msg").html(`
			<div class="card-feel">
				<span class="text-danger">
					Ops!, you can't convert the same currency
				</span>
			</div>
		`);

        // hide error message
        setTimeout((e) => {
            $(".error_msg").html("");
        }, 1000 * 3);

        // stop proccess
        return false;
    }

    // on build query 
    let body = `${from}_${to}`;
    let query = {
        q: body
    };

    // convert currencies
    $.get('https://free.currencyconverterapi.com/api/v5/convert', query, (data) => {
        // convert to array
        const pairs = objectArray(data.results);

        // iterate pairs
        $.each(pairs, function(index, val) {
            let frElement = document.getElementById('curr-from');
            let frText = frElement.options[frElement.selectedIndex].innerHTML;
            let toElement = document.getElementById('curr-to');
            let toText = toElement.options[toElement.selectedIndex].innerHTML;
            $(".results").append(`
				<div class="card-feel">
                    <h1 class="small text-center" style="margin-top:40px;"> <b>${amount}</b>  <b>${val.fr}</b> to <b>${val.to}</b> successfully converted  ...</h1>
					<hr />
					The exchange rate for <b>${amount}</b> <b>${val.fr}</b> to <b>${val.to}</b> is: <br /> 
					<b>${numeral(amount * val.val).format('0.000')}</b>
				</div>
            `);

            /* $(".results").append(`
            <div class="output-results">	       
                <b>${amount} </b> <b> ${frText}</b><br> = <br><b>${(amount * data.value).toFixed(2)} ${toText}</b>
            </div>
        `);*/
            console.log(amount * val.val)
                // save object results for later use
            let object = {
                symbol: body,
                value: val.val
            };

            // save to the database
            saveToDatabase(object);
        });
    }).fail((err) => {
        // checking currencies from indexedDB
        fetchFromDatabase(body, amount);
    });

    // void form
    return false;
}

// array generators using map & arrow function
function objectArray(objects) {
    // body
    const results = Object.keys(objects).map(i => objects[i]);
    return results;
}

// page On Refresh
function pageOnRefresh() {
    // body
    window.location.reload();
}