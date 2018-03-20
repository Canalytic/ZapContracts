// import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

const Utils = require('./helpers/utils.js');
const EVMRevert = require("./helpers/EVMRevert");

const Bondage = artifacts.require("Bondage");
const BondageStorage = artifacts.require("BondageStorage");
const Registry = artifacts.require("Registry");
const RegistryStorage = artifacts.require("RegistryStorage");
const TheToken = artifacts.require("TheToken");
const Dispatch = artifacts.require("Dispatch");
const Arbiter = artifacts.require("Arbiter");
const Cost = artifacts.require("CurrentCost");

contract('Bondage', function (accounts) {
    const owner = accounts[0];
    const subscriber = accounts[1];
    const oracle = accounts[2];

    const publicKey = 111;
    const title = "test";
    const routeKeys = [1];
    const params = ["param1", "param2"];

    const specifier = "test-specifier";
    const curveLinear = Utils.CurveTypes["Linear"];
    const curveExponential = Utils.CurveTypes["Exponential"];
    const curveLogarithmic = Utils.CurveTypes["Logarithmic"];
    const zeroAddress = Utils.ZeroAddress;
    const start = 1;
    const mul = 2;
    
    const tokensForOwner = new BigNumber("1500e18");
    const tokensForSubscriber = new BigNumber("5000e18");
    const approveTokens = new BigNumber("1000e18");

    async function prepareProvider(provider = true, curve = true, account = oracle, type = curveLinear) {
        if (provider) await this.registry.initiateProvider(publicKey, title, specifier, params, { from: account });
        if (curve) await this.registry.initiateProviderCurve(specifier, type, start, mul, { from: account });
    }

    async function prepareTokens() {
        await this.token.allocate(owner, tokensForOwner, { from: owner });
        await this.token.allocate(subscriber, tokensForSubscriber, { from: owner });
        //await this.token.approve(this.bondage.address, approveTokens, {from: subscriber});
    }

    beforeEach(async function deployContracts() {
        this.currentTest.regStor = await RegistryStorage.new();
        this.currentTest.registry = await Registry.new(this.currentTest.regStor.address);
        this.currentTest.regStor.transferOwnership(this.currentTest.registry.address);

        this.currentTest.token = await TheToken.new();
        this.currentTest.currCost = await Cost.new();

        this.currentTest.bondStor = await BondageStorage.new();
        this.currentTest.bondage = await Bondage.new(this.currentTest.bondStor.address, this.currentTest.registry.address, this.currentTest.token.address, this.currentTest.currCost.address);
        this.currentTest.bondStor.transferOwnership(this.currentTest.bondage.address);

    });

    it("BONDAGE_1 - bond() - Check bond function", async function () {

        await prepareProvider.call(this.test);      
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
            
        await this.test.bondage.bond(oracle, specifier, 100, {from: subscriber});
    });

    it("BONDAGE_2 - bond() - Check that we can't bond oracle with unregistered provider", async function () {

        //prepareProvider.call(this.test, false, false);

        prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        
        
        //res = await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});
        expect(this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber})).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("BONDAGE_3 - bond() - Check that we can't bond oracle with uninitialized curve", async function () {

        //prepareProvider.call(this.test, true, false);
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: accounts[6] });
        prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        
        //res = await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});
        expect(this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber})).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("BONDAGE_4 - unbond() - Check unbond function", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        await this.test.bondage.unbond(oracle, specifier, 500, {from: subscriber});
    });

    it("BONDAGE_5 - calcTokForDots() - Check tok for dots calculating", async function () {
    
        //prepareProvider.call(this.test, true, true, accounts[5], curveLinear);
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: accounts[5] });
        await this.test.registry.initiateProviderCurve(specifier, curveLinear, start, mul, { from: accounts[5] });
        

        const jsLinearTok = Utils.calculateTokWithLinearCurve(5, start, mul);
        const res1 = await this.test.bondage.calcTokForDots.call(accounts[5], specifier, 5);
        const ethLinearTok = parseInt(res1.valueOf());

        await expect(jsLinearTok).to.be.equal(ethLinearTok);

        //prepareProvider.call(this.test, true, true, accounts[6], curveExponential);
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: accounts[6] });
        await this.test.registry.initiateProviderCurve(specifier, curveExponential, start, mul, { from: accounts[6] });
        
        const jsExponentialTok = Utils.calculateTokWithExponentialCurve(5, start, mul);
        const res2 = await this.test.bondage.calcTokForDots.call(accounts[6], specifier, 5);
        const ethExponentialTok = parseInt(res2.valueOf());

        await expect(jsExponentialTok).to.be.equal(ethExponentialTok);

        //prepareProvider.call(this.test, true, true, accounts[7], curveLogarithmic);
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: accounts[7] });
        await this.test.registry.initiateProviderCurve(specifier, curveLogarithmic, start, mul, { from: accounts[7] });
        
        const jsLogarithmicTok = Utils.calculateTokWithLogarithmicCurve(5, start, mul);
        const res3 = await this.test.bondage.calcTokForDots.call(accounts[7], specifier, 5);
        const ethLogarithmicTok = parseInt(res3.valueOf());

        await expect(jsLogarithmicTok).to.be.equal(ethLogarithmicTok);
    });

    it("BONDAGE_6 - calcTokForDots() - Check that function throw error if curve not intialized", async function () {

        //prepareProvider.call(this.test, true, false);
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: accounts[6] });
        
        //res = await this.test.bondage.calcTokForDots.call(accounts[5], specifier, 5);
        await expect(this.test.bondage.calcTokForDots.call(accounts[5], specifier, 5)).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("BONDAGE_7 - calcTok() - Check calcTok function", async function () {

        await prepareProvider.call(this.test);

        const res1 = await this.test.bondage.calcTok.call(oracle, specifier, 25, { from: subscriber });
        const ethTok = parseInt(res1[0].valueOf());
        const ethDots = parseInt(res1[1].valueOf());

        await expect(ethDots).to.be.equal(5);
        await expect(ethTok).to.be.equal(25);
    });

    it("BONDAGE_8 - calcTok() - Check calcTok function throw error if curve not initialized", async function () {

        //prepareProvider.call(this.test, true, false);
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: accounts[6] });

       
        //res = await this.test.bondage.calcTok.call(oracle, specifier, 26)
        await expect(this.test.bondage.calcTok.call(oracle, specifier, 26)).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("BONDAGE_9 - calcTok() - Check calcTok function return 0 dots if numTok is 0", async function () {

        await prepareProvider.call(this.test);

        const res1 = await this.test.bondage.calcTok.call(oracle, specifier, 0);
        const ethTok = parseInt(res1[0].valueOf());
        const ethDots = parseInt(res1[1].valueOf());

        await expect(ethDots).to.be.equal(0);
        await expect(ethTok).to.be.equal(0);
    });

    it("BONDAGE_10 - calcTok() - Check calcTok function return maximum dots and maximum tok if numTok is more than 100 dots cost", async function () {

        await prepareProvider.call(this.test);

        // max dots that you can receive for 1000 tokens with current curve
        const maxDots = 31;

        const jsLinearTok = Utils.calculateTokWithLinearCurve(maxDots + 1, start, mul);
        const jsLinearTokWillUsed = Utils.calculateTokWithLinearCurve(maxDots, start, mul);

        const res1 = await this.test.bondage.calcTok.call(oracle, specifier, jsLinearTok);
        const ethTok = parseInt(res1[0].valueOf());
        const ethDots = parseInt(res1[1].valueOf());

        await expect(ethDots).to.be.equal(maxDots);
        await expect(ethTok).to.be.equal(jsLinearTokWillUsed);
    });

    it("BONDAGE_11 - getDots() - Check received dots getting", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        // with current linear curve (startValue = 1, multiplier = 2) number of dots received should be equal to 5
        await this.test.bondage.bond(oracle, specifier, 26, {from: subscriber});

        const res = await this.test.bondage.getDots.call(subscriber, oracle, specifier, { from: subscriber });
        const receivedDots = parseInt(res.valueOf());

        await expect(receivedDots).to.be.equal(5);
    });

    it("BONDAGE_12 - getDots() - Check that number of dots of unbonded provider is 0", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        const res = await this.test.bondage.getDots.call(subscriber, oracle, specifier, { from: subscriber });
        const receivedDots = parseInt(res.valueOf());

        await expect(receivedDots).to.be.equal(0);
    });

/*ONLY PASS WHEN xAddress VARIABLE VISIBILITY IS CHANGED TO PUBLIC, MAKE SURE TO REMOVE PUBLIC VISIBILITY WHEN DONE TESTING
//CAN CURRENTLY RESET THESE ADDRESSES FOR UPGRADABILITY... MAY CHANGE TO CAN RESET

    it("BONDAGE_13 - setArbiterAddress() - Check that arbiter address was set", async function () {

        await this.test.bondage.setArbiterAddress(Arbiter.address, { from: owner });
        const res = await this.test.bondage.arbiterAddress.call();        
        expect(res.valueOf()).to.be.not.equal(zeroAddress);
    });

    it("BONDAGE_14 - setArbiterAddress() - Check that arbiter address can't be reset", async function () {

        await this.test.bondage.setArbiterAddress(Arbiter.address, { from: owner });

        const res1 = await this.test.bondage.arbiterAddress.call();

        await this.test.bondage.setArbiterAddress(accounts[9], { from: owner });

        const res2 = await this.test.bondage.arbiterAddress.call();

        expect(res1.valueOf()).to.be.equal(res2.valueOf());
    })

    it("BONDAGE_15 - setDispatchAddress() - Check that dispatch address was set", async function () {

        await this.test.bondage.setDispatchAddress(Dispatch.address, { from: owner });

        const res = await this.test.bondage.dispatchAddress.call();
        expect(res.valueOf()).to.be.not.equal(zeroAddress);
    });

    it("BONDAGE_16 - setDispatchAddress() - Check that dispatch address can't be reset", async function () {

        await this.test.bondage.setDispatchAddress(Dispatch.address, { from: owner });

        const res1 = await this.test.bondage.dispatchAddress.call();

        await this.test.bondage.setDispatchAddress(accounts[9], { from: owner });

        const res2 = await this.test.bondage.dispatchAddress.call();

        expect(res1.valueOf()).to.be.equal(res2.valueOf());
    });
*/ 

    it("BONDAGE_17 - getTokBound() - Check received tok getting", async function () {
        
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        // with current linear curve (startValue = 1, multiplier = 2) number of dots received should be equal to 5
        await this.test.bondage.bond(oracle, specifier, 26, {from: subscriber});

        const res = await this.test.bondage.getTokBound.call(oracle, specifier, { from: subscriber });
        const receivedTok = parseInt(res.valueOf());

        await expect(receivedTok).to.be.equal(25);
    });

    it("BONDAGE_18 - getTokBound() - Check that received tok of unbonded provider is 0", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        const res = await this.test.bondage.getTokBound.call(oracle, specifier, { from: subscriber });
        const receivedTok = parseInt(res.valueOf());

        await expect(receivedTok).to.be.equal(0);
    });

    it("BONDAGE_19 - escrowDots() - Check that operator can escrow dots", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.bondage.bond(oracle, specifier, 26, {from: subscriber});

        const dots = 5;
        const dotsForEscrow = 2;

        await this.test.bondage.setDispatchAddress(accounts[3], { from: owner });
        await this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] });

        const oracleDotsRes = await this.test.bondage.getDots.call(subscriber, oracle, specifier, { from: subscriber });
        const oracleDots = parseInt(oracleDotsRes.valueOf());

        const escrowDotsRes = await this.test.bondStor.getNumEscrow.call(subscriber, oracle, specifier);
        const escrowDots = parseInt(escrowDotsRes.valueOf());

        await expect(oracleDots).to.be.equal(dots - dotsForEscrow);
        await expect(escrowDots).to.be.equal(dotsForEscrow);
    });

    it("BONDAGE_20 - escrowDots() - Check that not operator can't escrow dots", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.bondage.bond(oracle, specifier, 26, {from: subscriber});

        const dots = 5;
        const dotsForEscrow = 2;

       // await this.test.bondage.setDispatchAddress(accounts[3], { from: owner });
        await this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] });
        
        const oracleDotsRes = await this.test.bondage.getDots.call(subscriber, oracle, specifier, { from: subscriber });
        const oracleDots = parseInt(oracleDotsRes.valueOf());

        const escrowDotsRes = await this.test.bondStor.getNumEscrow.call(subscriber, oracle, specifier);
        const escrowDots = parseInt(escrowDotsRes.valueOf());

        await expect(oracleDots).to.be.equal(dots);
        await expect(escrowDots).to.be.equal(0);
    });

    it("BONDAGE_21 - escrowDots() - Check that operator can't escrow dots from oracle that haven't got enough dots", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.bondage.bond(oracle, specifier, 0, {from: subscriber});

        const dots = 0;
        const dotsForEscrow = 2;

       // await this.test.bondage.setDispatchAddress(accounts[3], { from: owner });
        await this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] });
        
        const oracleDotsRes = await this.test.bondage.getDots.call(subscriber, oracle, specifier, { from: subscriber });
        const oracleDots = parseInt(oracleDotsRes.valueOf());

        const escrowDotsRes = await this.test.bondStor.getNumEscrow.call(subscriber, oracle, specifier);
        const escrowDots = parseInt(escrowDotsRes.valueOf());

        await expect(oracleDots).to.be.equal(0);
        await expect(escrowDots).to.be.equal(0);
    });

    it("BONDAGE_22 - releaseDots() - Check that operator can release dots", async function () {
    
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.bondage.bond(oracle, specifier, 26, {from: subscriber});

        const dots = 5;
        const dotsForEscrow = 2;

        const forRelease = accounts[8];

        await this.test.bondage.setDispatchAddress(accounts[3], { from: owner });
        await this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] });
        await this.test.bondage.releaseDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] });

        const oracleDotsRes = await this.test.bondage.getDots.call(subscriber, oracle, specifier);
        const oracleDots = parseInt(oracleDotsRes.valueOf());

        const pendingDotsRes = await this.test.bondStor.getNumEscrow.call(subscriber, oracle, specifier);
        const pendingDots = parseInt(pendingDotsRes.valueOf());

        const releaseRes = await this.test.bondage.getDots.call(oracle, oracle, specifier, { from: oracle });
        const releaseDots = parseInt(releaseRes.valueOf());

        await expect(oracleDots).to.be.equal(dots - dotsForEscrow);
        await expect(pendingDots).to.be.equal(0);
        await expect(releaseDots).to.be.equal(dotsForEscrow);
    });

    it("BONDAGE_23 - releaseDots() - Check that operator can release dots if trying to release more dots than escrowed", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.bondage.bond(oracle, specifier, 26, {from: subscriber});

        const dots = 5;
        const dotsForEscrow = 2;

        const forRelease = accounts[8];

        await this.test.bondage.setDispatchAddress(accounts[3], { from: owner });
        await this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] });
        await this.test.bondage.releaseDots(subscriber, oracle, specifier, dotsForEscrow + 2, { from: accounts[3] });

        const oracleDotsRes = await this.test.bondage.getDots.call(subscriber, oracle, specifier, { from: subscriber });
        const oracleDots = parseInt(oracleDotsRes.valueOf());

        const escrowDotsRes = await this.test.bondStor.getNumEscrow.call(subscriber, oracle, specifier);
        const escrowDots = parseInt(escrowDotsRes.valueOf());

        const releaseRes = await this.test.bondage.getDots.call(oracle, oracle, specifier, { from: oracle });
        const releaseDots = parseInt(releaseRes.valueOf());


        await expect(oracleDots).to.be.equal(dots - dotsForEscrow);
        await expect(escrowDots).to.be.equal(dotsForEscrow);
        await expect(releaseDots).to.be.equal(0);
    });

    it("BONDAGE_24 - getDotsIssued() - Check that issued dots will increase with every bond", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        
        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.bondage.bond(oracle, specifier, 26, {from: subscriber});
        await this.test.bondage.bond(oracle, specifier, 14, {from: subscriber});

        const issuedDots = await this.test.bondage.getDotsIssued.call(oracle, specifier);
        await expect(parseInt(issuedDots.valueOf())).to.be.equal(6);
    });

    it("BONDAGE_25 - getDotsIssued() - Check that issued dots will decrease with every unbond", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.bondage.bond(oracle, specifier, 26, {from: subscriber});
        await this.test.bondage.bond(oracle, specifier, 14, {from: subscriber});

        await this.test.bondage.unbond(oracle, specifier, 1, {from: subscriber});

        const issuedDots = await this.test.bondage.getDotsIssued.call(oracle, specifier);
        await expect(parseInt(issuedDots.valueOf())).to.be.equal(5);
    });

    it("BONDAGE_26 - currentCostOfDot() - Check current dot cost calculations", async function () {

        //prepareProvider.call(this.test, true, true, accounts[5], curveLinear);
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: accounts[5] });
        await this.test.registry.initiateProviderCurve(specifier, curveLinear, start, mul, { from: accounts[5] });

        //prepareProvider.call(this.test, true, true, accounts[6], curveExponential);
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: accounts[6] });
        await this.test.registry.initiateProviderCurve(specifier, curveExponential, start, mul, { from: accounts[6] });

        //prepareProvider.call(this.test, true, true, accounts[7], curveLogarithmic);
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: accounts[7] });
        await this.test.registry.initiateProviderCurve(specifier, curveLogarithmic, start, mul, { from: accounts[7] });

        const dotNumber = 99;
        const linearDotCost = mul * dotNumber + start
        const expDotCost = mul * Math.pow(dotNumber, 2) + start;
        const logDotCost = Math.ceil(mul * Math.log2(dotNumber) + start);

        const res1 = await this.test.bondage.currentCostOfDot.call(accounts[5], specifier, dotNumber);
        const ethLinearRes = parseInt(res1.valueOf());

        const res2 = await this.test.bondage.currentCostOfDot.call(accounts[6], specifier, dotNumber);
        const ethExpRes = parseInt(res2.valueOf());

        const res3 = await this.test.bondage.currentCostOfDot.call(accounts[7], specifier, dotNumber);
        const ethLogrRes = parseInt(res3.valueOf());

        await expect(ethLinearRes).to.be.equal(linearDotCost);
        await expect(ethExpRes).to.be.equal(expDotCost);
        await expect(ethLogrRes).to.be.equal(logDotCost);
    });
/* ONLY PASSES WHEN VISIBILITY OF fastlog2 IS PUBLIC
    it("BONDAGE_27 - fastlog2() - Check log2 calculations", async function () {
        async function checkLog(value) {
            let jsResult = Math.ceil(Math.log2(value));
            let res = await this.bondage.fastlog2.call(value, { from: owner });
            let ethResult = parseInt(res.valueOf());
            expect(jsResult).to.be.equal(ethResult);
        }
        for (var i = 1; i <= 100; i++) checkLog.call(this.test, i);
    });
*/
});