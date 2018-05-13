"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Server_1 = require("../src/rest/Server");
const fs = require("fs");
const InsightFacade_1 = require("../src/controller/InsightFacade");
const chai = require("chai");
const chai_1 = require("chai");
const Util_1 = require("../src/Util");
const chaiHttp = require("chai-http");
describe("Facade D3", function () {
    let facade = null;
    let server = null;
    chai.use(chaiHttp);
    before(function () {
        facade = new InsightFacade_1.default();
        server = new Server_1.default(4321);
        return server.start().then(function (result) {
            if (result) {
                Util_1.default.trace("Server Start");
            }
        }).catch(function (err) {
            Util_1.default.trace("Failed to start server" + err);
        });
    });
    after(function () {
        return server.stop().then(function (result) {
            if (result) {
                Util_1.default.trace("Server Stop");
            }
        }).catch(function (err) {
            Util_1.default.trace("Failed to stop server" + err);
        });
    });
    beforeEach(function () {
    });
    afterEach(function () {
    });
    it("Server has started", function () {
        return chai.request("http://localhost:4321").get("/echo/310").then(function (response) {
            chai_1.expect(response.body.result).to.equal("310...310");
        }).catch(function (err) {
            chai_1.expect.fail();
            Util_1.default.trace("no good");
        });
    });
    it("PUT test for courses dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .attach("body", fs.readFileSync("./test/data/courses.zip"), "courses.zip")
                .then(function (res) {
                Util_1.default.trace("then:" + res.body);
                chai_1.expect(res.status).to.be.equal(204);
            })
                .catch(function (err) {
                Util_1.default.trace("catch:" + err.body);
            });
        }
        catch (err) {
            chai_1.expect.fail();
            Util_1.default.trace("try:catch:" + err.body);
        }
    });
    it("Should be able to get dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .get("/datasets")
                .then(function (res) {
                Util_1.default.trace("then:" + res.body);
                chai_1.expect(res.status).to.equal(200);
            })
                .catch(function (err) {
                Util_1.default.trace("catch:" + err);
                chai_1.expect.fail();
            });
        }
        catch (err) {
            chai_1.expect.fail();
            Util_1.default.trace(err.body);
        }
    });
    it("Should be able to echo", function () {
        try {
            return chai.request("http://localhost:4321")
                .get("/echo/:msg").then(function (res) {
                Util_1.default.trace("then:" + res.body);
                chai_1.expect(res.status).to.equal(200);
            })
                .catch(function (err) {
                Util_1.default.trace("catch:" + err);
                chai_1.expect.fail();
            });
        }
        catch (err) {
            chai_1.expect.fail();
            Util_1.default.trace(err.body);
        }
    });
    it("Should not be able to echo", function () {
        const res = Server_1.default.performEcho(null);
        Util_1.default.trace("then:" + res.body);
        chai_1.expect(res.code).to.equal(400);
    });
    it("Should get item", function () {
        return chai.request("http://localhost:4321")
            .get("/")
            .then(function (res) {
            Util_1.default.trace("then" + res.body);
            chai_1.expect(res.send).not.to.be.equal(500);
        })
            .catch(function (err) {
            Util_1.default.trace("catch" + err.body);
        });
    });
    it("POST 200", function () {
        try {
            return chai.request("http://localhost:4321")
                .post("/query")
                .send({
                WHERE: {
                    GT: {
                        courses_avg: 97,
                    },
                },
                OPTIONS: {
                    COLUMNS: [
                        "courses_dept",
                        "courses_avg",
                    ],
                    ORDER: "courses_avg",
                    FORM: "TABLE",
                },
            })
                .then(function (res) {
                Util_1.default.trace("then:");
                Util_1.default.trace(res.body);
                chai_1.expect(res.status).to.equal(200);
            })
                .catch(function (err) {
                Util_1.default.trace("catch:" + err);
                chai_1.expect.fail();
            });
        }
        catch (err) {
            chai_1.expect.fail();
            Util_1.default.trace(err.body);
        }
    });
    it("POST 400", function () {
        return chai.request("http://localhost:4321")
            .post("/query")
            .send({
            WHERE: {
                GT: {},
            },
            OPTIONS: {
                COLUMNS: [
                    "courses_dept",
                    "courses_avg",
                ],
                ORDER: "courses_avg",
                FORM: "TABLE",
            },
        })
            .then(function (res) {
            Util_1.default.trace("then:" + res);
            chai_1.expect.fail();
        })
            .catch(function (err) {
            Util_1.default.trace("catch:" + err.body);
            chai_1.expect(err.status).to.equal(400);
        });
    });
    it("del 204", function () {
        try {
            return chai.request("http://localhost:4321")
                .del("/dataset/courses")
                .then(function (res) {
                chai_1.expect(res.status).to.equal(204);
                Util_1.default.trace("then:" + res.body);
            }).catch(function (err) {
                Util_1.default.trace("catch:" + err);
                chai_1.expect.fail();
            });
        }
        catch (err) {
            chai_1.expect.fail();
            Util_1.default.trace(err.body);
        }
    });
    it("PUT test for courses dataset, set test environmen", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .attach("body", fs.readFileSync("./test/data/courses.zip"), "courses.zip")
                .then(function (res) {
                Util_1.default.trace("then " + res.body);
                chai_1.expect(res.status).to.be.equal(204);
            })
                .catch(function (err) {
                Util_1.default.trace("catch " + err.body);
            });
        }
        catch (err) {
            chai_1.expect.fail();
            Util_1.default.trace("try:catch:" + err.body);
        }
    });
});
//# sourceMappingURL=Server.spec.js.map