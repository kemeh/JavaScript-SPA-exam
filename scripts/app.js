$(() => {
    const app = Sammy('#container', function () {
        this.use("Handlebars", "hbs");

        this.get("index.html", loadHomeScreen);

        this.get("#/home", loadHomeScreen);

        this.get("#/auth", function (ctx) {
            ctx.loadPartials({
                footer: "./templates/common/footer.hbs",
                loginForm: "./templates/auth/loginForm.hbs",
                registerForm: "./templates/auth/registerForm.hbs",
            }).then(function () {
                this.partial("./templates/auth/authPage.hbs");
            });
        });

        this.post("#/register", function (ctx) {
            let username = ctx.params["username-register"];
            let password = ctx.params["password-register"];
            let repPassword = ctx.params["password-register-check"];

            if(username.length < 5) {
                notificator.showError("Username shouldn`t be less than 5 characters!")
            } else if(password === ''){
                notificator.showError("Password shouldn`t be empty!")
            } else if(password !== repPassword){
                notificator.showError("Passwords mismatch!")
            } else {
                auth.register(username, password)
                    .then((user) => {
                        auth.saveSession(user);
                        notificator.showInfo("User registration successful.");
                        ctx.redirect("#/home");
                    })
                    .catch(notificator.handleError);
            }
        });

        this.post("#/login", function (ctx) {
            let username = ctx.params["username-login"];
            let password = ctx.params["password-login"];

            if(username.length < 5) {
                notificator.showError("Username shouldn`t be less than 5 characters!")
            } else if(password === ''){
                notificator.showError("Password shouldn`t be empty!")
            } else {
                auth.login(username, password)
                    .then((user) => {
                        auth.saveSession(user);
                        notificator.showInfo("Login successful.");
                        ctx.redirect("#/home");
                    })
                    .catch(notificator.handleError);
            }
        });

        this.get("#/logout", function (ctx) {
            auth.logout()
                .then((res) => {
                    sessionStorage.clear();
                    notificator.showInfo("Logout successful.");
                    ctx.redirect("#/home");
                })
                .catch(notificator.handleError);
        });

        this.get("#/receipt", function (ctx) {
            let total = 0;
            let entriesCount = 0;
            ctx.cashierName = sessionStorage.getItem("username");
            receiptService.getActive()
                .then((res) => {
                    let receipt;

                    if(res.length === 0){
                        receiptService.createReceipt()
                            .then((newReceipt) => {
                                receipt = newReceipt;
                                receiptService.saveReceiptInSession(newReceipt._id);
                                ctx.total = total;
                                ctx.entriesCount = entriesCount;
                                ctx.receiptId = newReceipt._id;

                                loadReceiptView(ctx);
                            })
                            .catch(notificator.handleError);
                    } else {
                        receipt = res[0];
                        receiptService.saveReceiptInSession(receipt._id);
                        receiptService.getEntries(receipt._id)
                            .then((entries) => {
                                entries.forEach((e) => {
                                    e.subTotal = (Number(e.qty) * Number(e.price)).toFixed(2);
                                    total += Number(e.subTotal);
                                    entriesCount++;
                                });

                                ctx.total = total.toFixed(2);
                                ctx.entries = entries;
                                ctx.entriesCount = entriesCount;
                                ctx.receiptId = receipt._id;

                                loadReceiptView(ctx);
                            })
                            .catch(notificator.handleError);
                    }
                })
                .catch(notificator.handleError);
        });

        this.post("#/entry/create", function (ctx) {
            let type = ctx.params.type;
            let qty = ctx.params.qty;
            if(qty !== ''){
                qty = Number(ctx.params.qty);
            }

            let price = ctx.params.price;
            if(price !== ''){
                price = Number(ctx.params.price);
            }
            let receiptId = sessionStorage.getItem("receiptId");

            if(type === "" || type === null){
                notificator.showError("The type of the product shouldn`t be empty!")
            } else if(qty === "" || isNaN(qty)){
                notificator.showError("The quantity should be a number!")
            } else if(price === "" || isNaN(price)){
                notificator.showError("The price should be a number!")
            } else {
                receiptService.addEntry(type, qty, precisionRound(price, 2), receiptId)
                    .then((entry) => {
                        notificator.showInfo("Entry added");
                        ctx.redirect("#/receipt");
                    })
                    .catch(notificator.handleError);
            }
        });

        this.get("#/entry/:id/delete", function (ctx) {
            let id = ctx.params.id;
            receiptService.deleteEntry(id)
                .then((res) => {
                    notificator.showInfo("Entry removed");
                    ctx.redirect("#/receipt");
                })
                .catch(notificator.handleError);
        });

        this.post("#/commit", function (ctx) {
            let receiptId = ctx.params.receiptId;
            let productCount = ctx.params.productCount;
            let total = ctx.params.total;

            if(productCount > 0){
                receiptService.commitReceipt(receiptId, productCount, total)
                    .then((res) => {
                        notificator.showInfo("Receipt checked out");
                        ctx.redirect("#/receipt");
                    })
                    .catch(notificator.handleError);
            } else {
                notificator.showError("The receipt is empty!");
                ctx.redirect("#/receipt");
            }
        });

        this.get("#/overview", function (ctx) {
            ctx.cashierName = sessionStorage.getItem("username");

            receiptService.getMyReceipts()
                .then((res) => {
                    res.forEach((r) => {
                        let date = new Date(r._kmd.ect);
                        r.date = transformDate(date);
                    });
                    ctx.receipts = res;


                    ctx.loadPartials({
                        header: "./templates/common/header.hbs",
                        navigation: "./templates/common/navigation.hbs",
                        footer: "./templates/common/footer.hbs",
                        receipt: "./templates/receipt/overview/receipt.hbs",
                    })
                        .then(function () {
                            this.partial("./templates/receipt/overview/overviewPage.hbs")
                        })
                })
                .catch(notificator.handleError);
        });

        this.get("#/receipt/:id/details", function (ctx) {
            let id = ctx.params.id;
            ctx.cashierName = sessionStorage.getItem("username");

            receiptService.getEntries(id)
                .then((res) => {
                    res.forEach((e) => {
                        e.subTotal = Number(e.qty) * Number(e.price);
                    });
                    ctx.entries = res;
                    ctx.loadPartials({
                        header: "./templates/common/header.hbs",
                        navigation: "./templates/common/navigation.hbs",
                        footer: "./templates/common/footer.hbs",
                        entry: "./templates/receipt/details/entry.hbs",
                    })
                        .then(function () {
                            this.partial("./templates/receipt/details/detailsPage.hbs")
                        })
                })
                .catch(notificator.showError);
        });

        function loadHomeScreen(ctx) {
            if(auth.isAuth()){
                ctx.redirect("#/receipt");
            } else {
                ctx.redirect("#/auth")
            }
        }

        function loadReceiptView(ctx) {
            ctx.loadPartials({
                header: "./templates/common/header.hbs",
                navigation: "./templates/common/navigation.hbs",
                footer: "./templates/common/footer.hbs",
                listEntries: "./templates/receipt/create/listEntries.hbs",
                createEntryForm: "./templates/receipt/create/createEntryForm.hbs",
                commitReceiptForm: "./templates/receipt/create/commitReceiptForm.hbs",
                entry: "./templates/receipt/create/entry.hbs"
            })
                .then(function () {
                    this.partial("./templates/receipt/create/createPage.hbs")
                });
        }

        function precisionRound(number, precision) {
            let factor = Math.pow(10, precision);
            return Math.round(number * factor) / factor;
        }

        function transformDate(date){
            let year = date.getFullYear();
            let month = date.getMonth().pad(2);
            let day = date.getUTCDate();
            let hour = date.getHours();
            let minutes = date.getMinutes();

            return `${year}-${month}-${day} ${hour}:${minutes}`;
        }

        Number.prototype.pad = function(size) {
            let s = String(this);
            while (s.length < (size || 2)) {s = "0" + s;}
            return s;
        };

        Handlebars.registerHelper('priceFixed', function(price) {
            return Number(price).toFixed(2);
        });

    });

    app.run();
});
