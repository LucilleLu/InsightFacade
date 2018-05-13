"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const IInsightFacade_1 = require("../src/controller/IInsightFacade");
const InsightFacade_1 = require("../src/controller/InsightFacade");
const Util_1 = require("../src/Util");
const TestUtil_1 = require("./TestUtil");
describe("InsightFacade Add/Remove Dataset", function () {
    const datasetsToLoad = {
        rooms: "./test/data/rooms.zip",
        courses: "./test/data/courses.zip",
        sub: "./test/data/sub.zip",
        emptyzip: "./test/data/emptyzip.zip",
        WrongFormatedDataset: "./test/data/WrongFormatedDataset.zip",
    };
    let insightFacade;
    let datasets;
    before(function () {
        return __awaiter(this, void 0, void 0, function* () {
            Util_1.default.test(`Before: ${this.test.parent.title}`);
            try {
                const loadDatasetPromises = [];
                for (const [id, path] of Object.entries(datasetsToLoad)) {
                    loadDatasetPromises.push(TestUtil_1.default.readFileAsync(path));
                }
                const loadedDatasets = (yield Promise.all(loadDatasetPromises)).map((buf, i) => {
                    return { [Object.keys(datasetsToLoad)[i]]: buf.toString("base64") };
                });
                datasets = Object.assign({}, ...loadedDatasets);
                chai_1.expect(Object.keys(datasets)).to.have.length.greaterThan(0);
            }
            catch (err) {
                chai_1.expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
            }
            try {
                insightFacade = new InsightFacade_1.default();
            }
            catch (err) {
                Util_1.default.error(err);
            }
            finally {
                chai_1.expect(insightFacade).to.be.instanceOf(InsightFacade_1.default);
            }
        });
    });
    beforeEach(function () {
        Util_1.default.test(`BeforeTest: ${this.currentTest.title}`);
    });
    after(function () {
        Util_1.default.test(`After: ${this.test.parent.title}`);
    });
    afterEach(function () {
        Util_1.default.test(`AfterTest: ${this.currentTest.title}`);
    });
    it("Should add a valid dataset/room", () => __awaiter(this, void 0, void 0, function* () {
        const id = "rooms";
        const expectedCode = 204;
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Rooms);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response.code).to.equal(expectedCode);
        }
    }));
    it("Should add a valid dataset/course", () => __awaiter(this, void 0, void 0, function* () {
        const id = "courses";
        const expectedCode = 204;
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response.code).to.equal(expectedCode);
        }
    }));
    it("Should not be to add duplicated dataset", () => __awaiter(this, void 0, void 0, function* () {
        const id = "courses";
        const expectedCode = 400;
        let response;
        yield insightFacade.removeDataset(id);
        yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response.code).to.equal(expectedCode);
            chai_1.expect(response.body).to.have.property("error");
        }
    }));
    it("Add a empty zip, and should return error 400", () => __awaiter(this, void 0, void 0, function* () {
        const id = "emptyzip";
        const expectedCode = 400;
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response.code).to.equal(expectedCode);
            chai_1.expect(response.body).to.have.property("error");
        }
    }));
    it("Add a not existed room dataset, unable to load zip file, and should return error 400", () => __awaiter(this, void 0, void 0, function* () {
        const id = "roomEmptyFile";
        const expectedCode = 400;
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Rooms);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response.code).to.equal(expectedCode);
            chai_1.expect(response.body).to.have.property("error");
        }
    }));
    it("Add a dataset with wrongly formated files, and should return error 400", () => __awaiter(this, void 0, void 0, function* () {
        const id = "WrongFormatedDataset";
        const expectedCode = 400;
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response.code).to.equal(expectedCode);
            chai_1.expect(response.body).to.have.property("error");
        }
    }));
    it("Try a not exited id, and should return error 400", () => __awaiter(this, void 0, void 0, function* () {
        const id = "alkdfj";
        const expectedCode = 400;
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response.code).to.equal(expectedCode);
            chai_1.expect(response.body).to.have.property("error");
        }
    }));
    it("Should remove the rooms dataset", () => __awaiter(this, void 0, void 0, function* () {
        const id = "rooms";
        const expectedCode = 204;
        let response;
        response = yield insightFacade.listDatasets();
        try {
            response = yield insightFacade.removeDataset(id);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response.code).to.equal(expectedCode);
        }
    }));
    it("Remove not existed dataset, and return error", () => __awaiter(this, void 0, void 0, function* () {
        const id = "random";
        const expectedCode = 404;
        let response;
        try {
            response = yield insightFacade.removeDataset(id);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response.code).to.equal(expectedCode);
            chai_1.expect(response.body).to.have.property("error");
        }
    }));
    it("Should be able to list single dataset", () => __awaiter(this, void 0, void 0, function* () {
        const id1 = "courses";
        let response;
        insightFacade.removeDataset(id1);
        try {
            yield insightFacade.addDataset(id1, datasets[id1], IInsightFacade_1.InsightDatasetKind.Courses);
            response = yield insightFacade.listDatasets();
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response.code).to.equal(200);
        }
    }));
    it("Should be able to list multiple datasets", () => __awaiter(this, void 0, void 0, function* () {
        const id1 = "courses";
        const id2 = "sub";
        insightFacade.removeDataset(id1);
        insightFacade.removeDataset(id2);
        let response;
        try {
            yield insightFacade.addDataset(id1, datasets[id1], IInsightFacade_1.InsightDatasetKind.Courses);
            yield insightFacade.addDataset(id2, datasets[id2], IInsightFacade_1.InsightDatasetKind.Courses);
            response = yield insightFacade.listDatasets();
            insightFacade.removeDataset(id2);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response.code).to.equal(200);
        }
    }));
    it("Should remove the courses dataset", () => __awaiter(this, void 0, void 0, function* () {
        const id = "courses";
        const expectedCode = 204;
        let response;
        response = yield insightFacade.listDatasets();
        try {
            response = yield insightFacade.removeDataset(id);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response.code).to.equal(expectedCode);
        }
    }));
    it("Should add a valid dataset/room, for condition", () => __awaiter(this, void 0, void 0, function* () {
        const id = "rooms";
        const expectedCode = 204;
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Rooms);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response.code).to.equal(expectedCode);
        }
    }));
    it("Should add a valid dataset/course, for condition", () => __awaiter(this, void 0, void 0, function* () {
        const id = "courses";
        const expectedCode = 204;
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response.code).to.equal(expectedCode);
        }
    }));
});
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery = {
        courses: "./test/data/courses.zip",
        rooms: "./test/data/rooms.zip",
    };
    let insightFacade;
    let testQueries = [];
    before(function () {
        return __awaiter(this, void 0, void 0, function* () {
            Util_1.default.test(`Before: ${this.test.parent.title}`);
            try {
                testQueries = yield TestUtil_1.default.readTestQueries();
                chai_1.expect(testQueries).to.have.length.greaterThan(0);
            }
            catch (err) {
                chai_1.expect.fail("", "", `Failed to read one or more test queries. ${JSON.stringify(err)}`);
            }
            try {
                insightFacade = new InsightFacade_1.default();
            }
            catch (err) {
                Util_1.default.error(err);
            }
            finally {
                chai_1.expect(insightFacade).to.be.instanceOf(InsightFacade_1.default);
            }
            try {
                const loadDatasetPromises = [];
                for (const [id, path] of Object.entries(datasetsToQuery)) {
                    loadDatasetPromises.push(TestUtil_1.default.readFileAsync(path));
                }
                const loadedDatasets = (yield Promise.all(loadDatasetPromises)).map((buf, i) => {
                    return { [Object.keys(datasetsToQuery)[i]]: buf.toString("base64") };
                });
                chai_1.expect(loadedDatasets).to.have.length.greaterThan(0);
                const responsePromises = [];
                const datasets = Object.assign({}, ...loadedDatasets);
                for (const [id, content] of Object.entries(datasets)) {
                    responsePromises.push(insightFacade.addDataset(id, content, IInsightFacade_1.InsightDatasetKind.Courses));
                }
                try {
                    const responses = yield Promise.all(responsePromises);
                    responses.forEach((response) => chai_1.expect(response.code).to.equal(204));
                }
                catch (err) {
                    Util_1.default.warn(`Ignoring addDataset errors. For D1, you should allow errors to fail the Before All hook.`);
                }
            }
            catch (err) {
                chai_1.expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
            }
        });
    });
    beforeEach(function () {
        Util_1.default.test(`BeforeTest: ${this.currentTest.title}`);
    });
    after(function () {
        Util_1.default.test(`After: ${this.test.parent.title}`);
    });
    afterEach(function () {
        Util_1.default.test(`AfterTest: ${this.currentTest.title}`);
    });
    it("Should run test queries", () => {
        describe("Dynamic InsightFacade PerformQuery tests", () => {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, () => __awaiter(this, void 0, void 0, function* () {
                    let response;
                    try {
                        response = yield insightFacade.performQuery(test.query);
                    }
                    catch (err) {
                        response = err;
                    }
                    finally {
                        chai_1.expect(response.code).to.equal(test.response.code);
                        if (test.response.code >= 400) {
                            chai_1.expect(response.body).to.have.property("error");
                        }
                        else {
                            chai_1.expect(response.body).to.have.property("result");
                            const expectedResult = test.response.body.result;
                            const actualResult = response.body.result;
                            chai_1.expect(actualResult).to.deep.equal(expectedResult);
                        }
                    }
                }));
            }
        });
    });
});
//# sourceMappingURL=InsightFacade.spec.js.map