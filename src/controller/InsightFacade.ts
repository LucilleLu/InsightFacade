import Decimal from "decimal.js";
import fs = require("fs");
import http = require("http");
import zip = require("jszip");
import parse5 = require("parse5");
import { isUndefined } from "util";
import Log from "../Util";
import { IArr, IBuilding, ICourse, IDataset, IInsightFacade, InsightResponseSuccessBody } from "./IInsightFacade";
import { InsightDataset, InsightDatasetKind, InsightResponse, InsightResponseErrorBody, IRoom } from "./IInsightFacade";
import { IGeoResponse } from "./IInsightFacade";

/**
 * This is the main programmatic entry point for the project.
 */

const datasets: { [id: string]: IDataset } = {};

function FilterData(allData: IArr, opt: string, requirement: any): IArr | string {
    let filteredData: IArr = [];
    // requirement: {"courses_pass" : 1000}
    // reqOnCol: "courses_pass"
    // reqVal: 1000
    const reqOnCol: string = Object.keys(requirement)[0];
    const reqVal: any = requirement[reqOnCol];
    switch (opt) {
        case "GT": {
            if (typeof reqVal !== "number") { return "GT is operated on data with type other than number"; }
            for (const data of allData) {
                const d: any = data;
                if (typeof d[reqOnCol] === "undefined") { return "no such where column"; }
                if (d[reqOnCol] > reqVal) {
                    filteredData.push(data);
                }
            }
            break;
        }
        case "LT": {
            if (typeof reqVal !== "number") { return "LT is operated on data with type other than number"; }
            for (const data of allData) {
                const d: any = data;
                if (d[reqOnCol] < reqVal) {
                    filteredData.push(data);
                }
            }
            break;
        }
        case "EQ": {
            if (typeof reqVal !== "number") { return "EQ is operated on data with type other than number"; }
            for (const data of allData) {
                const d: any = data;
                if (d[reqOnCol] === reqVal) {
                    filteredData.push(data);
                }
            }
            break;
        }
        case "IS": {
            // requirement: {"courses_title" : "*a*"}
            // reqOnCol: "courses_title"
            // reqVal: *a, a*, *a*, asd
            if (typeof reqVal !== "string") { return "IS is operated on data with type other than string"; }
            if (reqVal.includes("*")) {
                if (reqVal.startsWith("*") && reqVal.endsWith("*")) {
                    // reqVal: *a*
                    for (const course of allData) {
                        const c: any = course;
                        const strVal: string = c[reqOnCol];
                        const pattern: string = reqVal.substring(1, reqVal.length - 1);
                        if (strVal.includes(pattern)) {
                            filteredData.push(course);
                        }
                    }
                } else {
                    if (reqVal.startsWith("*")) {
                        for (const course of allData) {
                            const c: any = course;
                            if (c[reqOnCol].endsWith(reqVal.substring(1, reqVal.length))) {
                                filteredData.push(course);
                            }
                        }
                    } else {
                        if (reqVal.endsWith("*")) {
                            for (const course of allData) {
                                const c: any = course;
                                if (c[reqOnCol].startsWith(reqVal.substring(0, reqVal.length - 1))) {
                                    filteredData.push(course);
                                }
                            }
                        } else {
                            return "Wrong wild card format";
                        }
                    }
                }
            } else {
                // reqVal: asd
                for (const course of allData) {
                    const c: any = course;
                    if (c[reqOnCol] === reqVal) {
                        filteredData.push(course);
                    }
                }
            }
            break;
        }
        case "OR": {
            if (requirement.length === 0) { return "Empty OR"; }
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
            if (requirement.length === 0) { return "Empty AND"; }
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
            let notWantedDataTwoType: IArr | string;
            for (const req of Object.keys(requirement)) {
                // if (requirement[key] === 0) {return "Empty NOT";}
                notWantedDataTwoType = FilterData(allData, req, requirement[req]);
            }
            if (typeof notWantedDataTwoType === "string") {
                return notWantedDataTwoType;
            }
            const notWantedData: IArr = notWantedDataTwoType;
            filteredData = allData.filter((n) => !notWantedData.includes(n));
            break;
        }
        default: {
            return "No such operation (NOT is a operation)";
        }
    }
    return filteredData;
}

function AnalyzeFilter(dataSetid: string, filter: { [key: string]: any }): Array<ICourse | IRoom> | string {
    // filter = query["where']
    let allData: any[];
    for (const id in datasets) {
        if (id === dataSetid) {
            allData = datasets[id].sub;
        }
    }
    for (const operator of Object.keys(filter)) { // operator can be: IS NOT AND OR LT GT EQ
        if (operator === undefined) {
            // const err: InsightResponse = {code: 400, body: {error: "WHERE is empty"}};
            return allData;
        }
        return FilterData(allData, operator, filter[operator]);
    }
    return allData;
}

function AnalyzeOptions(filteredData: Array<ICourse | IRoom>, query: any): IArr | string {
    const columns: string[] = [];
    for (const col of query.COLUMNS) {
        if (typeof col !== "string") {
            return "wrong column format";
        } else {
            const propofData: string[] = Object.keys(filteredData[0]);
            if (!propofData.includes(col)) {
                return "no such column";
            }
            columns.push(col);
        }
    }
    const order: any = query.ORDER;
    // TODO: may be case problem
    // if (typeof order !== "string" && typeof order !== "object") {
    //     return "wrong order formate";
    // }
    if (columns.length === 0) {
        return "There is no column";
    }
    // find all columns in filtered data
    let wantedData: IArr | string = [];
    for (const data of filteredData) {
        const row: any = {};
        for (const column of columns) {
            const d: any = data;
            row[column] = d[column];
        }
        wantedData.push(row);
    }
    if (typeof order !== "undefined") {
        if (typeof order === "string" && !columns.includes(order)) { return "order key is not in columns"; }
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

function AnalyzeOrder(order: any, wantedData: IArr): IArr | string {
    switch (typeof order) {
        case "string": {
            wantedData.sort(function (a: { [key: string]: any }, b: { [key: string]: any }) {
                return (a[order] > b[order]) ? 1 : ((b[order] > a[order]) ? -1 : 0);
            });
            break;
        }
        case "object": {
            if (Object.keys(order).includes("dir")) {
                const orderSA: string[] = order.keys;
                switch (order.dir) {
                    case "UP": {
                        wantedData.sort(function (a: { [key: string]: any }, b: { [key: string]: any }) {
                            return compare(a, b, orderSA, 0);
                        });
                        break;
                    }
                    case "DOWN": {
                        wantedData.sort(function (a: { [key: string]: any }, b: { [key: string]: any }) {
                            return (-1) * compare(a, b, orderSA, 0);
                        });
                        break;
                    }
                    default: {
                        return "no such order operation";
                    }
                }
            } else {
                const orderSA: string[] = order;
                wantedData.sort(function (a: { [key: string]: any }, b: { [key: string]: any }) {
                    return compare(a, b, orderSA, 0);
                });
            }
            break;
        }
    }
    return wantedData;
}

function compare(a: { [key: string]: any }, b: { [key: string]: any }, orderSA: string[], index: number): 1 | -1 | 0 {
    if (a[orderSA[index]] > b[orderSA[index]]) { return 1; }
    if (a[orderSA[index]] < b[orderSA[index]]) { return -1; }
    if (a[orderSA[index]] === b[orderSA[index]]) {
        if (index === orderSA.length - 1) {
            return 0;
        } else {
            return compare(a, b, orderSA, index + 1);
        }
    }
}

function AnalyzeTransformations(data: IArr, query: any): string | any[] {
    let grouped: { [uniquePropertyValue: string]: IArr } | string;
    grouped = AnalyzeGroup(data, query["GROUP"]);
    if (typeof grouped === "string") { return grouped; }
    const applyed: IArr | string = AnalyzeApply(grouped, query["APPLY"]);
    return applyed;
}

function AnalyzeGroup(data: IArr, query: string[]): string | { [uniquePropertyValue: string]: IArr } {
    // query: ["courses_title", "courses_dept"]
    // groups: {"{titile: 310}, {instructor: Sam}": [c]}
    const groups: { [property: string]: IArr } = {};
    for (const course of data) {
        const props: any = {};
        const c: any = course;
        for (const groupByElement of query) {
            if (!((groupByElement.includes("_")) && (groupByElement.split("_").length === 2))) {
                return "wrong group by element format e.g. course_a_a";
            }
            // const property: string = groupByElement.split("_")[1];    // property example: title
            let value: string = c[groupByElement].toString();
            if (value.length === 0) {
                value = "No Value";
            }
            props[groupByElement] = value;
        }
        // props example: ["{courese_titile: 310, courses_instructor: Sam}"]
        const prop: string = JSON.stringify(props);
        // prop example: {courese_titile: 310, courses_instructor: Sam}
        if (typeof groups[prop] === "undefined") {
            groups[prop] = [course];
        } else {
            const values: IArr = groups[prop];
            values.push(course);
            groups[prop] = values;
        }
    }
    return groups;
}

function isApplykeyCorrect(query: any): boolean {
    const qs: string[] = [];
    for (const q of query) {
        if (qs.includes(Object.keys(q)[0]) || Object.keys(q)[0].includes("_")) {
            return false;
        } else {
            qs.push(Object.keys(q)[0]);
        }
    }
    return true;
}

function AnalyzeApply(groups: { [propertyValue: string]: IArr }, query: any[]): any[] | string {
    // query: [{"maxSeats": {"MAX": "rooms_seats"}}]
    // groups: {"{titile: 310, instructor: Sam}": [c1], "{titile: 210, instructor: Sam}": [c2]}
    if (!isApplykeyCorrect(query)) { return "apply key no unique"; }
    const results: any[] = [];
    for (const appEle of query) {
        // appEle: {"maxSeats": {"MAX": "rooms_seats"}};
        // name: maxSeats
        // req: {"MAX": "rooms_seats"}
        // opt: MAX
        // optOn: rooms_seats
        const name: string = Object.keys(appEle)[0];
        const req: any = appEle[name];
        const opt: string = Object.keys(req)[0];
        const optOn: string = req[opt];
        for (const groupByCombain of Object.keys(groups)) {
            // groupByCombain: "{titile: 310, instructor: Sam}"
            const cORr: IArr = groups[groupByCombain];
            let appReqRes: number | string | Decimal;
            if (opt === "MAX" || opt === "MIN" || opt === "AVG") {
                const a: any = Object.values(groups)[0][0];
                if (typeof a[optOn] !== "number") {
                    return "opt is max/min/avg but the column is not a number column";
                }
            }
            switch (opt) {
                case "MAX": {
                    appReqRes = Math.max.apply(Math, cORr.map(function (o) {
                        const on: any = o;
                        return on[optOn];
                    }));
                    break;
                }
                case "MIN": {
                    appReqRes = Math.min.apply(Math, cORr.map(function (o) {
                        const on: any = o;
                        return on[optOn];
                    }));
                    break;
                }
                case "AVG": {
                    let sum: Decimal = new Decimal(0);
                    for (const c of cORr) {
                        const cn: any = c;
                        sum = new Decimal(cn[optOn]).add(sum);
                    }
                    const total: number = sum.toNumber();
                    appReqRes = Number((total / cORr.length).toFixed(2));
                    break;
                }
                case "COUNT": {
                    const x: Set<any> = new Set<any>();
                    for (const c of cORr) {
                        const cn: any = c;
                        x.add(cn[optOn]);
                    }
                    appReqRes = x.size;
                    break;
                }
                case "SUM": {
                    let sum: Decimal = new Decimal(0);
                    for (const c of cORr) {
                        const cn: any = c;
                        sum = sum.add(new Decimal(cn[optOn]));
                    }
                    appReqRes = Number(sum.toFixed(2));
                    break;
                }
                default: {
                    appReqRes = "operation is not one of Max, Min, Avg, Count, or Sum";
                }
            }
            if (typeof appReqRes === "string") { return appReqRes; }
            const resultofApply: { [pro: string]: any } = JSON.parse(groupByCombain);
            // resultofApply: {titile: 310, instructor: Sam}
            for (const key of Object.keys(resultofApply)) {
                if (resultofApply[key] === "No Value") {
                    resultofApply[key] = "";
                }
            }
            resultofApply[name] = appReqRes; // resultofApply: {titile: 310, instructor: Sam, maxSeats: 1}
            results.push(resultofApply);
        }
    }
    return results;
}

function isAllinColumns(query: any): boolean {
    const trans: any = query.TRANSFORMATIONS;
    const order: any = query.OPTIONS.ORDER;
    const columns: string[] = query.OPTIONS.COLUMNS;
    if (typeof trans !== "undefined") {
        const group: string[] = trans.GROUP;
        const apply: any = trans.APPLY;
        if (typeof group !== "undefined") {
            // If a GROUP is present, all COLUMNS terms must correspond to either GROUP terms or to terms defined
            // in the APPLY block.
            const applyCols: string[] = [];
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
        } else {
            return true;
        }
    } else {
        if (typeof order !== "undefined") {
            // 'SORT' - Any keys provided must be in the COLUMNS
            switch (typeof order) {
                case "string": {
                    if (!columns.includes(order)) { return false; }
                    break;
                }
                case "object": {
                    if (order.hasOwnProperty("dir")) {
                        for (const key of order.keys) {
                            if (!columns.includes(key)) { return false; }
                        }
                    } else {
                        for (const key of order) {
                            if (!columns.includes(key)) { return false; }
                        }
                    }
                    break;
                }
                default: { return false; }
            }
            return true;
        } else {
            return true;
        }
    }
}

function findNode(html: any, name: string): any {
    let returnNodes: any = [];
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
    } catch (error) {
        Log.trace("Line 490 " + error);
    }
    return [];
}

function latlonResponse(geourl: string) {
    return new Promise(function (fulfill, reject) {
        http.get(geourl, (response: any) => {
            let rawData = "";
            response.on("data", (chunk: any) => rawData += chunk);
            response.on("end", () => {
                try {
                    const parsedData = JSON.parse(rawData);
                    fulfill(parsedData);

                } catch (err) {
                    Log.trace(err.message);
                }
            });
        }).on("error", (err: any) => {
            Log.trace(`Got error: ${err.message}`);
        });
    });
}

function roomArrGenerator(building: any) {
    return new Promise(function (fulfill, reject) {
        const roomArray: any[] = [];
        building.file.async("text").then(function (infoString: any) {
            const roomInfo: any = parse5.parse(infoString);
            const roomtbodyArray = findNode(roomInfo, "tbody");
            if (roomtbodyArray.length !== 0) {
                const tbody = roomtbodyArray[0];
                const roomtrArray = findNode(tbody, "tr");
                for (const roomtr of roomtrArray) {
                    const room: IRoom = {} as IRoom;
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
            } else { fulfill([]); }
        });
    });
}

export default class InsightFacade implements IInsightFacade {

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<InsightResponse> {
        return new Promise(function (fulfill, reject) {
            let msg: InsightResponse = {} as InsightResponse;
            if (fs.existsSync(id + ".txt")) {
                const errmes: string = "Add failed, the dataset is alreay added.";
                const responsebody: InsightResponseErrorBody = { error: errmes };
                msg = { code: 400, body: responsebody };
                reject(msg);
            } else {
                if (kind === "rooms") {
                    const unzippedArray: string[] = [];
                    const cObjectArray: IRoom[] = [];
                    const buildingArray: any = [];
                    const roomGenFunctions: any = [];
                    const latlonLocation: any = [];
                    let roomArray: IRoom[] = [];
                    zip.loadAsync(content, { base64: true }).then(function (unziped: any) {
                        unziped.files["index.htm"].async("text").then(function (data: any) {
                            const html: any = parse5.parse(data);
                            const tbodyArray = findNode(html, "tbody");
                            for (const table of tbodyArray) {
                                const trArray = findNode(table, "tr");
                                for (const tr of trArray) {
                                    const building: IBuilding = {} as IBuilding;
                                    const tdArray = findNode(tr, "td");

                                    for (const td of tdArray) {
                                        // fullname
                                        if (td.attrs[0].value === "views-field views-field-title") {
                                            const aArray = findNode(td, "a");
                                            const a = aArray[0];
                                            building.fullname = a.childNodes[0].value;
                                        }

                                        // shortname
                                        if (td.attrs[0].value === "views-field views-field-field-building-code") {
                                            building.shortname = td.childNodes[0].value.trim();
                                        }

                                        // filepath
                                        if (td.attrs[0].value === "views-field views-field-nothing") {
                                            const aArray = findNode(td, "a");
                                            const a = aArray[0];
                                            building.url = a.attrs[0].value.substr(2);
                                            building.file = unziped.file(building.url);
                                        }
                                        // address,latlon
                                        if (td.attrs[0].value === "views-field views-field-field-building-address") {
                                            building.address = td.childNodes[0].value.trim();
                                            // get geolocation by address
                                            const uriAddress: string = encodeURIComponent(building.address.trim());
                                            building.geourl =
                                                "http://skaha.cs.ubc.ca:11316/api/v1/team38/" + uriAddress;
                                            latlonLocation.push(latlonResponse(building.geourl));
                                        }
                                    }
                                    buildingArray.push(building);
                                }
                            }

                            Promise.all(latlonLocation).then(function (location: IGeoResponse[]) {
                                for (let i = 0; i < location.length; i++) {
                                    if (isUndefined(location[i].error)) {
                                        buildingArray[i].lat = location[i].lat;
                                        buildingArray[i].lon = location[i].lon;
                                    }
                                }
                                // building array
                                for (const building of buildingArray) {
                                    roomGenFunctions.push(roomArrGenerator(building));
                                }
                                Promise.all(roomGenFunctions).then(function (ful: any[]) {
                                    for (const f of ful) {
                                        roomArray = roomArray.concat(f);
                                    }
                                    const roomdata = JSON.stringify(roomArray);
                                    fs.writeFileSync(id + ".txt", roomdata);
                                    const insightdataset: InsightDataset = { id, kind, numRows: roomArray.length };
                                    datasets[id] = { meta: insightdataset, sub: roomArray };
                                    msg.code = 204;
                                    msg.body = { result: roomArray};
                                    fulfill(msg);
                                });
                            }).catch(function (err1: InsightResponse) {
                                err1 = { code: 400, body: { error: "Array of asyn Promises failed" } };
                                reject(err1);
                            });
                        }).catch(function (err2: InsightResponse) {
                            err2 = { code: 400, body: { error: "Unzipping index.htm failed" } };
                            reject(err2);
                        });
                    }).catch(function (err3: InsightResponse) {
                        err3 = { code: 400, body: { error: "zip loadAsync file failed" } };
                        reject(err3);
                    });
                } else if (kind === "courses") {
                    const unzippedArray: string[] = [];
                    const cObjectArray: ICourse[] = [];
                    zip.loadAsync(content, { base64: true }).then(function (unzipped: any) {
                        Object.keys(unzipped.files).forEach(function (filename: any) {
                            unzippedArray.push(unzipped.files[filename].async("string"));
                        });

                        Promise.all(unzippedArray).then(function (myArray: string[]) {
                            for (const item of myArray) {
                                let parsed;
                                if (item !== "") {
                                    try {
                                        parsed = JSON.parse(item);
                                        if (parsed.result !== []) {
                                            for (const p of parsed.result) {
                                                if (p !== []) {
                                                    const cObject: ICourse = {} as ICourse;
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
                                                    } else {
                                                        cObject.courses_year = p.Year;
                                                    }
                                                    cObject.courses_highestgrade = p.High;
                                                    cObject.courses_session = p.Session;
                                                    cObject.courses_campus = p.Campus;
                                                    cObjectArray.push(cObject);
                                                }
                                            }
                                        }
                                    } catch (err) {
                                        Log.trace("file is invalid type");
                                    }
                                }
                            }
                            if (cObjectArray.length === 0) {
                                const errmes: string = "Add failed, the dataset contains no valid files.";
                                msg = { code: 400, body: { error: errmes } };
                                return reject(msg);
                            }
                            const coursedata = JSON.stringify(cObjectArray);
                            fs.writeFileSync(id + ".txt", coursedata);
                            const insightdataset: InsightDataset = { id, kind, numRows: cObjectArray.length };
                            // const dataset: IDataset = {meta: insightdataset, sub: cObjectArray};
                            datasets[id] = { meta: insightdataset, sub: cObjectArray };
                            msg.code = 204;
                            msg.body = { result: cObjectArray };
                            fulfill(msg);
                        }).catch(function (err1: InsightResponse) {
                            err1 = { code: 400, body: { error: "Array of asyn Promises failed" } };
                            reject(err1);
                        });
                    }).catch(function (err2: InsightResponse) {
                        err2 = { code: 400, body: { error: "Unzipping file failed" } };
                        reject(err2);
                    });
                }
            }
        });
    }

    public removeDataset(id: string): Promise<InsightResponse> {
        return new Promise(function (fulfill, reject) {
            const msg: InsightResponse = {} as InsightResponse;
            if (fs.existsSync(id + ".txt")) { // there is file in disk
                fs.truncateSync(id + ".txt", 0);
                fs.unlinkSync(id + ".txt");
                // delete dataset from memory here
                delete datasets[id];
                msg.code = 204;
                msg.body = { result: "Data delete sucessufully" };
                fulfill(msg);
            } else {
                msg.code = 404;
                msg.body = { error: "Data is not exist in the disk or in variable, delete failed" };
                reject(msg);
            }
        });
    }

    public performQuery(query: any): Promise<InsightResponse> {
        return new Promise(function (fulfill, reject) {
            if (query.WHERE === undefined // there is no where
                || query.WHERE === JSON.stringify({})    // where is empty
                || query.OPTIONS === undefined // there is no options
                || query.OPTIONS === JSON.stringify({})    // options is empty
                || query.OPTIONS.COLUMNS === undefined // there is no column
                || query.OPTIONS.COLUMNS === JSON.stringify({})
                || !isAllinColumns(query)) { // column is empty
                const responsebody: InsightResponseErrorBody = { error: "wrong format" };
                const result: InsightResponse = { code: 400, body: responsebody };
                reject(result);
            }
            const querys: string = JSON.stringify(query);
            if (querys.includes("courses_") !== querys.includes("rooms_")) {
                // if this query is for course
                let id: string;
                if (querys.includes("courses_")) { id = "courses"; } else {id = "rooms"; }
                const filteredData: string | Array<IRoom | ICourse> = AnalyzeFilter(id, query["WHERE"]);
                if (typeof filteredData === "string") {
                    const err: InsightResponseErrorBody = { error: filteredData };
                    const res: InsightResponse = { code: 400, body: err };
                    reject(res);
                } else {
                    let transformedData: string | any[];
                    if (typeof query.TRANSFORMATIONS === "undefined") {
                        transformedData = filteredData;
                    } else {
                        transformedData = AnalyzeTransformations(filteredData, query["TRANSFORMATIONS"]);
                    }
                    if (typeof transformedData === "string") {
                        const err: InsightResponseErrorBody = { error: transformedData };
                        const res: InsightResponse = { code: 400, body: err };
                        reject(res);
                    } else {
                        let formatedData: string | Array<ICourse | IRoom> = [];
                        if (transformedData.length !== 0) {
                            formatedData = AnalyzeOptions(transformedData, query["OPTIONS"]);
                        }
                        if (typeof formatedData === "string") {
                            const err: InsightResponseErrorBody = { error: formatedData };
                            const res: InsightResponse = { code: 400, body: err };
                            reject(res);
                        } else {
                            const suc: InsightResponseSuccessBody = { result: formatedData };
                            const res: InsightResponse = { code: 200, body: suc };
                            fulfill(res);
                        }
                    }
                }
            } else {
                // wrong query format
                const errbody: string = "wrong database name e.g. student_avg no database called student";
                const err: InsightResponseErrorBody = { error: errbody };
                const res: InsightResponse = { code: 400, body: err };
                reject(res);

            }
        });
    }

    public listDatasets(): Promise<InsightResponse> {
        return new Promise(function (fulfill) {
            const content: InsightDataset[] = [];
            for (const did of Object.keys(datasets)) {
                let iDataset: IDataset;
                iDataset = datasets[did];
                let insightDataset: InsightDataset;
                insightDataset = iDataset.meta;
                content.push(insightDataset);
            }
            for (const o of content) {
                Log.info(o.id);
            }
            const responsebody = { code: 200, body: { result: content } };
            fulfill(responsebody);
        });
    }
}
