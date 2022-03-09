var pages = [];
var _launch_type = 0;

function launch(page_num, launch_config, launch_type, tagFunction,initFunction) {

    const puppeteer = require('puppeteer');

    if (!launch_type) {
        launch_type = 0;
    } else {
        launch_type = 1;
    }
    _launch_type = launch_type;
    return new Promise(function (launch_ok, launch_error) {
        if (!puppeteer) {
            launch_error();
            return;
        }
        (async () => {
            var browser = await puppeteer.launch(launch_config);


            async function newPages() {

                for (var i = 0; i < page_num; i++) {

                    var page = null;
                    if (i == 0) page = (await browser.pages())[0];
                    else {
                        if (launch_type == 0) {

                            page = await browser.newPage();
                        } else {

                            page = (await (await puppeteer.launch(launch_config)).pages())[0];
                        }
                    }


                    page.ws = {};
                    page.ws.index = i;
                    page.ws.enable = true;
                    if (tagFunction && (typeof tagFunction==="function")) {
                        page.ws.tag = await tagFunction(i);
                    } else {
                        page.ws.tag = "-1";
                    }
                    page.release = ((page) => {

                        return async function (gotoBlank = true) {
                            if (gotoBlank)
                                await page.goto("about:blank");
                            if (getPage.callbacks[page.ws.tag] && (getPage.callbacks[page.ws.tag].length > 0))
                                getPage.callbacks[page.ws.tag].shift()(page);
                            else {
                                page.ws.enable = true;
                            }
                        }

                    })(page);
                    if(initFunction && (typeof initFunction==="function")){
                        await initFunction(i,page);
                    }    
                    pages.push(page);

                }

            }

            await newPages();
            launch_ok(true);

        })();
    });
}

function getPage(tag = "-1") {
    return new Promise(function (ok, error) {
        for (var i = 0; i < pages.length; i++) {

            if (pages[i].ws.enable) {
                pages[i].ws.enable = false;
                ok(pages[i]);
                return;
            }
        }
        if (!getPage.callbacks.hasOwnProperty(tag)) {
            getPage.callbacks[tag] = [];
        }
        getPage.callbacks[tag].push(ok);

    });
}

getPage.callbacks = {};


function doWork(callable, tag = "-1") {
    (async () => {
        var page = await getPage(tag);
        callable(page)
    })();

}


async function doWorkConcurrent(pageSize, callable, tag = "-1") {
    var promise_pages = [];
    for (var i = 0; i < pageSize; i++) {

        promise_pages.push((i => new Promise(function (ok, error) {
            (async () => {
                var page = await getPage(tag);
                ok(await callable(i, page));
                await page.release();
            })();
        }))(i));
    }

    return await Promise.all(promise_pages);


}

async function close() {
    if (_launch_type == 0) {
        await pages[0].browser().close();
    } else {
        for (var i = 0; i < pages.length; i++)
            await pages[i].browser().close();
    }

}


function _page_blance(browser, page_num, tagFunction = null) {
    this.pages = [];
    this.browser = browser;
    this.page_num = page_num;
    this.callbacks = {};
    this.launch(tagFunction);

}

_page_blance.prototype = {
    launch: async (tagFunction) => {
        let page_num = this.page_num;
        let browser = this.browser;
        var that = this;

        for (var i = 0; i < page_num; i++) {

            var page = await browser.newPage();

            page.ws = {};
            page.ws.index = i;
            page.ws.enable = true;
            if (tagFunction) {
                page.ws.tag = await tagFunction(i);
            } else {
                page.ws.tag = "-1";
            }
            page.release = ((page) => {

                return async function (gotoBlank = true) {
                    if (gotoBlank)
                        await page.goto("about:blank");


                    if (that.callbacks[page.ws.tag] && (that.callbacks[page.ws.tag].length > 0))
                        that.callbacks[page.ws.tag].shift()(page);
                    else {
                        page.ws.enable = true;
                    }


                }



            })(page);

            this.pages.push(page);

        }

    },
    doWork: (callable,tag="-1") => {

        var that = this;
        (async () => {
            var page = await that.getPage(tag);
            callable(page)
        })();

    },
    getPage: (tag="-1") => {
        var pages = this.pages;
        var that = this;
        return new Promise(function (ok, error) {
            for (var i = 0; i < pages.length; i++) {

                if (pages[i].ws.enable) {
                    pages[i].ws.enable = false;
                    ok(pages[i]);
                    return;
                }
            }

            if (!that.callbacks.hasOwnProperty(tag)) {
                that.callbacks[tag] = [];
            }
            that.callbacks[tag].push(ok);
 
        });
    }
};


async function setCookies(page, domain, cookies) {
    for (var index in cookies) {
        await page.setCookie({
            name: index,
            value: cookies[index],
            domain: domain
        });
    }
}

async function setCookiesDomain(page, cookies) {
    for (var domain in cookies) {
        await setCookies(page, domain, cookies[domain]);
    }
}

module.exports = {
    launch: launch,
    doWork: doWork,
    newPage: getPage,
    getPage,
    getPage,
    doWorkConcurrent: doWorkConcurrent,
    close: close,
    setCookies: setCookies,
    setCookiesDomain: setCookiesDomain,
    new_page_blance: function (browser, page_num) {
        return new _page_blance(browser, page_num)
    }

};