"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const decimal_js_1 = require("decimal.js");
const fs = require("fs");
const http = require("http");
const zip = require("jszip");
const parse5 = require("parse5");
const util_1 = require("util");
const Util_1 = require("../Util");
const datasets = {};
function FilterData(allData, opt, requirement) {
    let filteredData = [];
    const reqOnCol = Object.keys(requirement)[0];
    const reqVal = requirement[reqOnCol];
    switch (opt) {
        case "GT": {
            if (typeof reqVal !== "number") {
                return "GT is operated on data with type other than number";
            }
            for (const data of allData) {
                const d = data;
                if (typeof d[reqOnCol] === "undefined") {
                    return "no such where column";
                }
                if (d[reqOnCol] > reqVal) {
                    filteredData.push(data);
                }
            }
            break;
        }
        case "LT": {
            if (typeof reqVal !== "number") {
                return "LT is operated on data with type other than number";
            }
            for (const data of allData) {
                const d = data;
                if (d[reqOnCol] < reqVal) {
                    filteredData.push(data);
                }
            }
            break;
        }
        case "EQ": {
            if (typeof reqVal !== "number") {
                return "EQ is operated on data with type other than number";
            }
            for (const data of allData) {
                const d = data;
                if (d[reqOnCol] === reqVal) {
                    filteredData.push(data);
                }
            }
            break;
        }
        case "IS": {
            if (typeof reqVal !== "string") {
                return "IS is operated on data with type other than string";
            }
            if (reqVal.includes("*")) {
                if (reqVal.startsWith("*") && reqVal.endsWith("*")) {
                    for (const course of allData) {
                        const c = course;
                        const strVal = c[reqOnCol];
                        const pattern = reqVal.substring(1, reqVal.length - 1);
                        if (strVal.includes(pattern)) {
                            filteredData.push(course);
                        }
                    }
                }
                else {
                    if (reqVal.startsWith("*")) {
                        for (const course of allData) {
                            const c = course;
                            if (c[reqOnCol].endsWith(reqVal.substring(1, reqVal.length))) {
                                filteredData.push(course);
                            }
                        }
                    }
                    else {
                        if (reqVal.endsWith("*")) {
                            for (const course of allData) {
                                const c = course;
                                if (c[reqOnCol].startsWith(reqVal.substring(0, reqVal.length - 1))) {
                                    filteredData.push(course);
                                }
                            }
                        }
                        else {
                            return "Wrong wild card format";
                        }
                    }
                }
            }
            else {
                for (const course of allData) {
                    const c = course;
                    if (c[reqOnCol] === reqVal) {
                        filteredData.push(course);
                    }
                }
            }
            break;
        }
        case "OR": {
            if (requirement.length === 0) {
                return "Empty OR";
            }
            for (const req of requirement) {
                for (const nextOpt of Object.keys(req)) {
                    if (nextOpt !== undefined) {
                        const oneOrData = FilterData(allData, nextOpt, req[nextOpt]);
                        if (typeof oneOrData === "string") {
                            return oneOrData;
                        }
                        for (const oneOR of oneOrData) {
                            if (!filteredData.includes(oneOR)) {
                                filteredData.push(oneOR);
                            }
                        }
                    }
                }
            }
            break;
        }
        case "AND": {
            if (requirement.length === 0) {
                return "Empty AND";
            }
            for (const req of requirement) {
                for (const nextOpt of Object.keys(req)) {
                    const oneAllData = FilterData(allData, nextOpt, req[nextOpt]);
                    if (typeof oneAllData === "string") {
                        return oneAllData;
                    }
                    if (oneAllData !== undefined) {
                        allData = oneAllData;
                    }
                }
            }
            filteredData = allData;
            break;
        }
        case "NOT": {
            let notWantedDataTwoType;
            for (const req of Object.keys(requirement)) {
                notWantedDataTwoType = FilterData(allData, req, requirement[req]);
            }
            if (typeof notWantedDataTwoType === "string") {
                return notWantedDataTwoType;
            }
            const notWantedData = notWantedDataTwoType;
            filteredData = allData.filter((n) => !notWantedData.includes(n));
            break;
        }
        default: {
            return "No such operation (NOT is a operation)";
        }
    }
    return filteredData;
}
function AnalyzeFilter(dataSetid, filter) {
    let allData;
    for (const id in datasets) {
        if (id === dataSetid) {
            allData = datasets[id].sub;
        }
    }
    for (const operator of Object.keys(filter)) {
        if (operator === undefined) {
            return allData;
        }
        return FilterData(allData, operator, filter[operator]);
    }
    return allData;
}
function AnalyzeOptions(filteredData, query) {
    const columns = [];
    for (const col of query.COLUMNS) {
        if (typeof col !== "string") {
            return "wrong column format";
        }
        else {
            const propofData = Object.keys(filteredData[0]);
            if (!propofData.includes(col)) {
                return "no such column";
            }
            columns.push(col);
        }
    }
    const order = query.ORDER;
    if (columns.length === 0) {
        return "There is no column";
    }
    let wantedData = [];
    for (const data of filteredData) {
        const row = {};
        for (const column of columns) {
            const d = data;
            row[column] = d[column];
        }
        wantedData.push(row);
    }
    if (typeof order !== "undefined") {
        if (typeof order === "string" && !columns.includes(order)) {
            return "order key is not in columns";
        }
        if (typeof order === "object" && Object.keys(order).includes("dir")) {
            for (const key of order.keys) {
                if (!columns.includes(key)) {
                    return "order key is not in columns";
                }
            }
        }
        if (typeof order === "object" && !Object.keys(order).includes("dir")) {
            for (const key of order) {
                if (!columns.includes(key)) {
                    return "order key is not in columns";
                }
            }
        }
        wantedData = AnalyzeOrder(order, wantedData);
    }
    return wantedData;
}
function AnalyzeOrder(order, wantedData) {
    switch (typeof order) {
        case "string": {
            wantedData.sort(function (a, b) {
                return (a[order] > b[order]) ? 1 : ((b[order] > a[order]) ? -1 : 0);
            });
            break;
        }
        case "object": {
            if (Object.keys(order).includes("dir")) {
                const orderSA = order.keys;
                switch (order.dir) {
                    case "UP": {
                        wantedData.sort(function (a, b) {
                            return compare(a, b, orderSA, 0);
                        });
                        break;
                    }
                    case "DOWN": {
                        wantedData.sort(function (a, b) {
                            return (-1) * compare(a, b, orderSA, 0);
                        });
                        break;
                    }
                    default: {
                        return "no such order operation";
                    }
                }
            }
            else {
                const orderSA = order;
                wantedData.sort(function (a, b) {
                    return compare(a, b, orderSA, 0);
                });
            }
            break;
        }
    }
    return wantedData;
}
function compare(a, b, orderSA, index) {
    if (a[orderSA[index]] > b[orderSA[index]]) {
        return 1;
    }
    if (a[orderSA[index]] < b[orderSA[index]]) {
        return -1;
    }
    if (a[orderSA[index]] === b[orderSA[index]]) {
        if (index === orderSA.length - 1) {
            return 0;
        }
        else {
            return compare(a, b, orderSA, index + 1);
        }
    }
}
function AnalyzeTransformations(data, query) {
    let grouped;
    grouped = AnalyzeGroup(data, query["GROUP"]);
    if (typeof grouped === "string") {
        return grouped;
    }
    const applyed = AnalyzeApply(grouped, query["APPLY"]);
    return applyed;
}
function AnalyzeGroup(data, query) {
    const groups = {};
    for (const course of data) {
        const props = {};
        const c = course;
        for (const groupByElement of query) {
            if (!((groupByElement.includes("_")) && (groupByElement.split("_").length === 2))) {
                return "wrong group by element format e.g. course_a_a";
            }
            let value = c[groupByElement].toString();
            if (value.length === 0) {
                value = "No Value";
            }
            props[groupByElement] = value;
        }
        const prop = JSON.stringify(props);
        if (typeof groups[prop] === "undefined") {
            groups[prop] = [course];
        }
        else {
            const values = groups[prop];
            values.push(course);
            groups[prop] = values;
        }
    }
    return groups;
}
function isApplykeyCorrect(query) {
    const qs = [];
    for (const q of query) {
        if (qs.includes(Object.keys(q)[0]) || Object.keys(q)[0].includes("_")) {
            return false;
        }
        else {
            qs.push(Object.keys(q)[0]);
        }
    }
    return true;
}
function AnalyzeApply(groups, query) {
    if (!isApplykeyCorrect(query)) {
        return "apply key no unique";
    }
    const results = [];
    for (const appEle of query) {
        const name = Object.keys(appEle)[0];
        const req = appEle[name];
        const opt = Object.keys(req)[0];
        const optOn = req[opt];
        for (const groupByCombain of Object.keys(groups)) {
            const cORr = groups[groupByCombain];
            let appReqRes;
            if (opt === "MAX" || opt === "MIN" || opt === "AVG") {
                const a = Object.values(groups)[0][0];
                if (typeof a[optOn] !== "number") {
                    return "opt is max/min/avg but the column is not a number column";
                }
            }
            switch (opt) {
                case "MAX": {
                    appReqRes = Math.max.apply(Math, cORr.map(function (o) {
                        const on = o;
                        return on[optOn];
                    }));
                    break;
                }
                case "MIN": {
                    appReqRes = Math.min.apply(Math, cORr.map(function (o) {
                        const on = o;
                        return on[optOn];
                    }));
                    break;
                }
                case "AVG": {
                    let sum = new decimal_js_1.default(0);
                    for (const c of cORr) {
                        const cn = c;
                        sum = new decimal_js_1.default(cn[optOn]).add(sum);
                    }
                    const total = sum.toNumber();
                    appReqRes = Number((total / cORr.length).toFixed(2));
                    break;
                }
                case "COUNT": {
                    const x = new Set();
                    for (const c of cORr) {
                        const cn = c;
                        x.add(cn[optOn]);
                    }
                    appReqRes = x.size;
                    break;
                }
                case "SUM": {
                    let sum = new decimal_js_1.default(0);
                    for (const c of cORr) {
                        const cn = c;
                        sum = sum.add(new decimal_js_1.default(cn[optOn]));
                    }
                    appReqRes = Number(sum.toFixed(2));
                    break;
                }
                default: {
                    appReqRes = "operation is not one of Max, Min, Avg, Count, or Sum";
                }
            }
            if (typeof appReqRes === "string") {
                return appReqRes;
            }
            const resultofApply = JSON.parse(groupByCombain);
            for (const key of Object.keys(resultofApply)) {
                if (resultofApply[key] === "No Value") {
                    resultofApply[key] = "";
                }
            }
            resultofApply[name] = appReqRes;
            results.push(resultofApply);
        }
    }
    return results;
}
function isAllinColumns(query) {
    const trans = query.TRANSFORMATIONS;
    const order = query.OPTIONS.ORDER;
    const columns = query.OPTIONS.COLUMNS;
    if (typeof trans !== "undefined") {
        const group = trans.GROUP;
        const apply = trans.APPLY;
        if (typeof group !== "undefined") {
            const applyCols = [];
            for (const applyby of apply) {
                applyCols.push(Object.keys(applyby)[0]);
            }
            for (const col of query.OPTIONS.COLUMNS) {
                if (!group.includes(col)) {
                    if (!applyCols.includes(col)) {
                        return false;
                    }
                }
            }
            return true;
        }
        else {
            return true;
        }
    }
    else {
        if (typeof order !== "undefined") {
            switch (typeof order) {
                case "string": {
                    if (!columns.includes(order)) {
                        return false;
                    }
                    break;
                }
                case "object": {
                    if (order.hasOwnProperty("dir")) {
                        for (const key of order.keys) {
                            if (!columns.includes(key)) {
                                return false;
                            }
                        }
                    }
                    else {
                        for (const key of order) {
                            if (!columns.includes(key)) {
                                return false;
                            }
                        }
                    }
                    break;
                }
                default: {
                    return false;
                }
            }
            return true;
        }
        else {
            return true;
        }
    }
}
function findNode(html, name) {
    let returnNodes = [];
    try {
        if (html.nodeName === name) {
            returnNodes.push(html);
            return returnNodes;
        }
        if (html.childNodes !== undefined) {
            for (const child of html.childNodes) {
                const t = findNode(child, name);
                if (t.length !== 0) {
                    returnNodes = returnNodes.concat(t);
                }
            }
            return returnNodes;
        }
    }
    catch (error) {
        Util_1.default.trace("Line 490 " + error);
    }
    return [];
}
function latlonResponse(geourl) {
    return new Promise(function (fulfill, reject) {
        http.get(geourl, (response) => {
            let rawData = "";
            response.on("data", (chunk) => rawData += chunk);
            response.on("end", () => {
                try {
                    const parsedData = JSON.parse(rawData);
                    fulfill(parsedData);
                }
                catch (err) {
                    Util_1.default.trace(err.message);
                }
            });
        }).on("error", (err) => {
            Util_1.default.trace(`Got error: ${err.message}`);
        });
    });
}
function roomArrGenerator(building) {
    return new Promise(function (fulfill, reject) {
        const roomArray = [];
        building.file.async("text").then(function (infoString) {
            const roomInfo = parse5.parse(infoString);
            const roomtbodyArray = findNode(roomInfo, "tbody");
            if (roomtbodyArray.length !== 0) {
                const tbody = roomtbodyArray[0];
                const roomtrArray = findNode(tbody, "tr");
                for (const roomtr of roomtrArray) {
                    const room = {};
                    room.rooms_fullname = building.fullname;
                    room.rooms_shortname = building.shortname;
                    room.rooms_address = building.address;
                    room.rooms_lat = parseFloat(building.lat);
                    room.rooms_lon = parseFloat(building.lon);
                    const roomtdArray = findNode(roomtr, "td");
                    for (const roomtd of roomtdArray) {
                        if (roomtd.attrs[0].value ===
                            "views-field views-field-field-room-number") {
                            const aArr = findNode(roomtd, "a");
                            const a = aArr[0];
                            room.rooms_number = a.childNodes[0].value;
                            room.rooms_name =
                                room.rooms_shortname + "_" + room.rooms_number;
                        }
                        if (roomtd.attrs[0].value ===
                            "views-field views-field-field-room-capacity") {
                            room.rooms_seats =
                                parseInt(roomtd.childNodes[0].value.trim(), 10);
                        }
                        if (roomtd.attrs[0].value ===
                            "views-field views-field-field-room-type") {
                            room.rooms_type = roomtd.childNodes[0].value.trim();
                        }
                        if (roomtd.attrs[0].value ===
                            "views-field views-field-field-room-furniture") {
                            const res = roomtd.childNodes[0].value;
                            room.rooms_furniture = res.trim();
                        }
                        if (roomtd.attrs[0].value ===
                            "views-field views-field-nothing") {
                            const aArr = findNode(roomtd, "a");
                            const a = aArr[0];
                            room.rooms_href = a.attrs[0].value;
                        }
                    }
                    roomArray.push(room);
                }
                fulfill(roomArray);
            }
            else {
                fulfill([]);
            }
        });
    });
}
class InsightFacade {
    constructor() {
        Util_1.default.trace("InsightFacadeImpl::init()");
    }
    addDataset(id, content, kind) {
        return new Promise(function (fulfill, reject) {
            let msg = {};
            if (fs.existsSync(id + ".txt")) {
                const errmes = "Add failed, the dataset is alreay added.";
                const responsebody = { error: errmes };
                msg = { code: 400, body: responsebody };
                reject(msg);
            }
            else {
                if (kind === "rooms") {
                    const unzippedArray = [];
                    const cObjectArray = [];
                    const buildingArray = [];
                    const roomGenFunctions = [];
                    const latlonLocation = [];
                    let roomArray = [];
                    zip.loadAsync(content, { base64: true }).then(function (unziped) {
                        unziped.files["index.htm"].async("text").then(function (data) {
                            const html = parse5.parse(data);
                            const tbodyArray = findNode(html, "tbody");
                            for (const table of tbodyArray) {
                                const trArray = findNode(table, "tr");
                                for (const tr of trArray) {
                                    const building = {};
                                    const tdArray = findNode(tr, "td");
                                    for (const td of tdArray) {
                                        if (td.attrs[0].value === "views-field views-field-title") {
                                            const aArray = findNode(td, "a");
                                            const a = aArray[0];
                                            building.fullname = a.childNodes[0].value;
                                        }
                                        if (td.attrs[0].value === "views-field views-field-field-building-code") {
                                            building.shortname = td.childNodes[0].value.trim();
                                        }
                                        if (td.attrs[0].value === "views-field views-field-nothing") {
                                            const aArray = findNode(td, "a");
                                            const a = aArray[0];
                                            building.url = a.attrs[0].value.substr(2);
                                            building.file = unziped.file(building.url);
                                        }
                                        if (td.attrs[0].value === "views-field views-field-field-building-address") {
                                            building.address = td.childNodes[0].value.trim();
                                            const uriAddress = encodeURIComponent(building.address.trim());
                                            building.geourl =
                                                "http://skaha.cs.ubc.ca:11316/api/v1/team38/" + uriAddress;
                                            latlonLocation.push(latlonResponse(building.geourl));
                                        }
                                    }
                                    buildingArray.push(building);
                                }
                            }
                            Promise.all(latlonLocation).then(function (location) {
                                for (let i = 0; i < location.length; i++) {
                                    if (util_1.isUndefined(location[i].error)) {
                                        buildingArray[i].lat = location[i].lat;
                                        buildingArray[i].lon = location[i].lon;
                                    }
                                }
                                for (const building of buildingArray) {
                                    roomGenFunctions.push(roomArrGenerator(building));
                                }
                                Promise.all(roomGenFunctions).then(function (ful) {
                                    for (const f of ful) {
                                        roomArray = roomArray.concat(f);
                                    }
                                    const roomdata = JSON.stringify(roomArray);
                                    fs.writeFileSync(id + ".txt", roomdata);
                                    const insightdataset = { id, kind, numRows: roomArray.length };
                                    datasets[id] = { meta: insightdataset, sub: roomArray };
                                    msg.code = 204;
                                    msg.body = { result: roomArray };
                                    fulfill(msg);
                                });
                            }).catch(function (err1) {
                                err1 = { code: 400, body: { error: "Array of asyn Promises failed" } };
                                reject(err1);
                            });
                        }).catch(function (err2) {
                            err2 = { code: 400, body: { error: "Unzipping index.htm failed" } };
                            reject(err2);
                        });
                    }).catch(function (err3) {
                        err3 = { code: 400, body: { error: "zip loadAsync file failed" } };
                        reject(err3);
                    });
                }
                else if (kind === "courses") {
                    const unzippedArray = [];
                    const cObjectArray = [];
                    zip.loadAsync(content, { base64: true }).then(function (unzipped) {
                        Object.keys(unzipped.files).forEach(function (filename) {
                            unzippedArray.push(unzipped.files[filename].async("string"));
                        });
                        Promise.all(unzippedArray).then(function (myArray) {
                            for (const item of myArray) {
                                let parsed;
                                if (item !== "") {
                                    try {
                                        parsed = JSON.parse(item);
                                        if (parsed.result !== []) {
                                            for (const p of parsed.result) {
                                                if (p !== []) {
                                                    const cObject = {};
                                                    cObject.courses_dept = p.Subject;
                                                    cObject.courses_id = p.Course;
                                                    cObject.courses_avg = p.Avg;
                                                    cObject.courses_instructor = p.Professor;
                                                    cObject.courses_title = p.Title;
                                                    cObject.courses_pass = p.Pass;
                                                    cObject.courses_fail = p.Fail;
                                                    cObject.courses_audit = p.Audit;
                                                    cObject.courses_uuid = p.id.toString();
                                                    cObject.courses_section = p.Section;
                                                    cObject.courses_lowestgrade = p.Low;
                                                    cObject.courses_withdrew = p.Withdrew;
                                                    if (p.Section === "overall") {
                                                        cObject.courses_year = 1900;
                                                    }
                                                    else {
                                                        cObject.courses_year = p.Year;
                                                    }
                                                    cObject.courses_highestgrade = p.High;
                                                    cObject.courses_session = p.Session;
                                                    cObject.courses_campus = p.Campus;
                                                    cObjectArray.push(cObject);
                                                }
                                            }
                                        }
                                    }
                                    catch (err) {
                                        Util_1.default.trace("file is invalid type");
                                    }
                                }
                            }
                            if (cObjectArray.length === 0) {
                                const errmes = "Add failed, the dataset contains no valid files.";
                                msg = { code: 400, body: { error: errmes } };
                                return reject(msg);
                            }
                            const coursedata = JSON.stringify(cObjectArray);
                            fs.writeFileSync(id + ".txt", coursedata);
                            const insightdataset = { id, kind, numRows: cObjectArray.length };
                            datasets[id] = { meta: insightdataset, sub: cObjectArray };
                            msg.code = 204;
                            msg.body = { result: cObjectArray };
                            fulfill(msg);
                        }).catch(function (err1) {
                            err1 = { code: 400, body: { error: "Array of asyn Promises failed" } };
                            reject(err1);
                        });
                    }).catch(function (err2) {
                        err2 = { code: 400, body: { error: "Unzipping file failed" } };
                        reject(err2);
                    });
                }
            }
        });
    }
    removeDataset(id) {
        return new Promise(function (fulfill, reject) {
            const msg = {};
            if (fs.existsSync(id + ".txt")) {
                fs.truncateSync(id + ".txt", 0);
                fs.unlinkSync(id + ".txt");
                delete datasets[id];
                msg.code = 204;
                msg.body = { result: "Data delete sucessufully" };
                fulfill(msg);
            }
            else {
                msg.code = 404;
                msg.body = { error: "Data is not exist in the disk or in variable, delete failed" };
                reject(msg);
            }
        });
    }
    performQuery(query) {
        return new Promise(function (fulfill, reject) {
            if (query.WHERE === undefined
                || query.WHERE === JSON.stringify({})
                || query.OPTIONS === undefined
                || query.OPTIONS === JSON.stringify({})
                || query.OPTIONS.COLUMNS === undefined
                || query.OPTIONS.COLUMNS === JSON.stringify({})
                || !isAllinColumns(query)) {
                const responsebody = { error: "wrong format" };
                const result = { code: 400, body: responsebody };
                reject(result);
            }
            const querys = JSON.stringify(query);
            if (querys.includes("courses_") !== querys.includes("rooms_")) {
                let id;
                if (querys.includes("courses_")) {
                    id = "courses";
                }
                else {
                    id = "rooms";
                }
                const filteredData = AnalyzeFilter(id, query["WHERE"]);
                if (typeof filteredData === "string") {
                    const err = { error: filteredData };
                    const res = { code: 400, body: err };
                    reject(res);
                }
                else {
                    let transformedData;
                    if (typeof query.TRANSFORMATIONS === "undefined") {
                        transformedData = filteredData;
                    }
                    else {
                        transformedData = AnalyzeTransformations(filteredData, query["TRANSFORMATIONS"]);
                    }
                    if (typeof transformedData === "string") {
                        const err = { error: transformedData };
                        const res = { code: 400, body: err };
                        reject(res);
                    }
                    else {
                        let formatedData = [];
                        if (transformedData.length !== 0) {
                            formatedData = AnalyzeOptions(transformedData, query["OPTIONS"]);
                        }
                        if (typeof formatedData === "string") {
                            const err = { error: formatedData };
                            const res = { code: 400, body: err };
                            reject(res);
                        }
                        else {
                            const suc = { result: formatedData };
                            const res = { code: 200, body: suc };
                            fulfill(res);
                        }
                    }
                }
            }
            else {
                const errbody = "wrong database name e.g. student_avg no database called student";
                const err = { error: errbody };
                const res = { code: 400, body: err };
                reject(res);
            }
        });
    }
    listDatasets() {
        return new Promise(function (fulfill) {
            const content = [];
            for (const did of Object.keys(datasets)) {
                let iDataset;
                iDataset = datasets[did];
                let insightDataset;
                insightDataset = iDataset.meta;
                content.push(insightDataset);
            }
            for (const o of content) {
                Util_1.default.info(o.id);
            }
            const responsebody = { code: 200, body: { result: content } };
            fulfill(responsebody);
        });
    }
}
exports.default = InsightFacade;
//# sourceMappingURL=InsightFacade.js.map