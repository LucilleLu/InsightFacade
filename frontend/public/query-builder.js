/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = function () {
    let query = {};
    let tapinfo = document.getElementsByClassName("tab-panel active").item(0);
    let dataset = tapinfo.getAttribute("data-type");
    let course_fields = ['audit','avg','dept','fail','id','instructor','pass','title','uuid','year'];
    let room_fields = ['address','fullname','furniture','href','lat','lon','name','number','seats','shortname','type'];
    let fields = [];
    if (dataset === "rooms"){
        fields = room_fields;
    } else {fields = course_fields;}

    // TODO: implement!

    function FilterObj() {

        var condtype = tapinfo.querySelectorAll("input[checked]")[0].id;     // and, any, none
        if (condtype.includes("all")) {
            condtype = "AND";
        } else {
            if (condtype.includes("any")) {
                condtype = "OR";
            } else {
                condtype = "NONE";
            }
        }

        var filters = tapinfo.getElementsByClassName("control-group condition");
        var ArrFilter = [];
        for (i = 0; i < filters.length; i++) {
            var filterObj = {};

            // extract info from ui
            let not = filters[i].getElementsByClassName("control not").item(0).querySelectorAll("input[checked]");
            let opt = filters[i].getElementsByClassName("control operators").item(0).querySelectorAll("option[selected]")[0].getAttribute("value");
            let term = filters[i].getElementsByClassName("control term").item(0).querySelectorAll("input")[0].getAttribute("value");
            let field = filters[i].getElementsByClassName("control fields").item(0).querySelectorAll("option[selected]")[0].getAttribute("value");
            if (fields.includes(field)) {
                field = dataset + "_" + field;
            }
            // build query object
            let restrine = {};
            if (opt != "IS") {
                restrine[field] = Number(term);
            } else {
                restrine[field] = term;
            }
            let operate = {};
            operate[opt] = restrine;


            if (condtype != "NONE") {
                if (not.length != 0) {
                    filterObj["NOT"] = operate;
                } else {
                    filterObj = operate;
                }
            } else {
                if (not.length != 0) {
                    filterObj = operate;
                } else {
                    filterObj["NOT"] = operate;
                }
            }

            ArrFilter.push(filterObj);
        }

        if (ArrFilter.length == 0) {
            return {};
        } else {
            if (ArrFilter.length == 1) {
                return ArrFilter[0];
            } else {
                if (condtype == "NONE") {
                    condtype = "AND";
                }
                var a = {};
                a[condtype] = ArrFilter;
                return a;
            }
        }
    }

    function ColuObj() {

        var colNode = tapinfo.getElementsByClassName("form-group columns").item(0).querySelectorAll("input[checked]");
        var columns = [];
        for (i = 0; i < colNode.length; i++) {
            var col = dataset + "_" + colNode[i].id.split("-")[3];
            if ( col.includes("undefined")){
                col = colNode[i].getAttribute("value");
            }
            columns.push(col);
        }
        return columns;
    }

    function OrdObj() {

        var isDes = tapinfo.getElementsByClassName("control descending").item(0).querySelectorAll("input[checked]").length;
        var keys_raw = tapinfo.getElementsByClassName("control order fields").item(0).querySelectorAll("option[selected]");
        var keys = [];
        for (i = 0; i < keys_raw.length; i++) {
            if (fields.includes(keys_raw.item(i).value)){
                keys.push(dataset + "_" + keys_raw.item(i).value);
            } else {keys.push(keys_raw.item(i).value);}
        }

        var dir;
        if (isDes == 0) {
            dir = "UP";
        } else {
            dir = "DOWN"
        }
        var order = {};
        order["dir"] = dir;
        order["keys"] = keys;
        return order;
    }

    function GroupObj() {
        var groups = [];
        var GroupNodes = tapinfo.getElementsByClassName("form-group groups")[0].querySelectorAll("input[checked]");
        for (i = 0; i < GroupNodes.length; i++) {
            groups.push(dataset + "_" + GroupNodes[i].value);
        }
        return groups;
    }

    function ApplyObj() {
        var applys = [];
        var applyNodes = tapinfo.getElementsByClassName("control-group transformation");
        for (i = 0; i < applyNodes.length; i++) {
            var name = applyNodes[i].querySelectorAll("input").item(0).value;
            var opt = applyNodes[i].querySelectorAll("select").item(0).value;
            var opton = applyNodes[i].querySelectorAll("select").item(1).value;
            if (fields.includes(opton)){
                opton = dataset + "_" + opton;
            }
            var obj = {};
            obj[name] = {};
            obj[name][opt] = opton;
            applys.push(obj);
        }
        return applys;
    }

    // WHERE clause
    query["WHERE"] = {};
    query["WHERE"] = FilterObj();

    // OPTIONS: columns order
    query["OPTIONS"] = {};
    // COLUMNS clause
    query.OPTIONS["COLUMNS"] = ColuObj();

    // ORDER clause
    var ordobj = OrdObj();
    if (ordobj.keys.length != 0) {
        query.OPTIONS["ORDER"] = ordobj;
    }


    // TRANSFORMATIONS clause: GROUP, APPLY
    query["TRANSFORMATIONS"] = {};
    if (GroupObj().length != 0) { // there is group by element
        // GROUP clause
        query.TRANSFORMATIONS["GROUP"] = GroupObj();
    }
    if (ApplyObj().length != 0){
        query.TRANSFORMATIONS["APPLY"] = ApplyObj();
    }
    if ( Object.keys(query.TRANSFORMATIONS).length === 0 && query.TRANSFORMATIONS.constructor === Object){
        delete query.TRANSFORMATIONS;
    }
    return query;
};
