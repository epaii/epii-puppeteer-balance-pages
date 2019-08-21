var pages = [];

function launch(page_num, launch_config, launch_type) {

    const puppeteer = require('puppeteer');

    if (!launch_type) {
        launch_type = 0;
    } else {
        launch_type = 1;
    }
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
                    page.release = ((page) => {
                        return function(){
                            page.ws.enable = true;
                            if (getPage.callbacks.length > 0)
                                getPage.callbacks.shift()(page);
                        }

                    })(page);

                    pages.push(page);

                }

            }

            await newPages();
            launch_ok(true);

        })();
    });
}

function getPage() {
    return new Promise(function (ok, error) {
        for (var i = 0; i < pages.length; i++) {

            if (pages[i].ws.enable) {
                pages[i].ws.enable = false;
                ok(pages[i]);
                return;
            }
        }

        getPage.callbacks.push(ok);

    });
}

getPage.callbacks = [];


function doWork(callable) {
    (async () => {
        var page = await  getPage();
        callable(page)
    })();

}


module.exports = {
    launch: launch,
    doWork: doWork

};
