/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = function(query) {
    return new Promise(function(fulfill, reject) {
        // TODO: implement!
        var xhttp = new XMLHttpRequest();
        var url = "/query";
        xhttp.open("POST", url, true);
        xhttp.setRequestHeader("Content-Type", "application/json");

        xhttp.onload = function () {
            try {
                var res = JSON.parse(xhttp.responseText);
                if (xhttp.status === 200) {
                    fulfill(res);
                } else {
                    reject(res);
                }
            } catch (e) {
                console.log("send query  line 24 "+ e);
            }
        };

        try {
            var JSON_query = JSON.stringify(query);
            xhttp.send(JSON_query);
        } catch (e) {
            reject("line 32 in send query " + e);
        }
    });
};
