let receiptService = (() => {

    function getActive() {
        let userId = sessionStorage.getItem("userId");

        return requester.get('appdata', `receipts?query={"_acl.creator":"${userId}","active":"true"}`, 'Kinvey');
    }

    function getEntries(receiptId) {

        return requester.get('appdata', `entries?query={"receiptId":"${receiptId}"}`, 'Kinvey');
    }

    function createReceipt() {
        let data = {
            active: true,
            productCount: 0,
            total: 0
        };

        return requester.post('appdata', 'receipts', 'Kinvey', data);
    }
    
    function addEntry(type, qty, price, receiptId) {
        let data = {
            type,
            qty,
            price,
            receiptId
        };

        return requester.post('appdata', 'entries', 'Kinvey', data);
    }

    function deleteEntry(entryId) {

        return requester.remove('appdata', 'entries/' + entryId, 'Kinvey');
    }
    
    function getMyReceipts() {
        let userId = sessionStorage.getItem("userId");

        return requester.get("appdata", `receipts?query={"_acl.creator":"${userId}","active":"false"}`, 'Kinvey');
    }
    
    function getReceiptDetails(receiptId) {

        return requester.get('appdata', 'receipts/' + receiptId, 'Kinvey');
    }
    
    function commitReceipt(receiptId, productCount, total) {
        let data = {
            active: false,
            productCount,
            total
        };

        return requester.update('appdata', 'receipts/' + receiptId, 'Kinvey', data);
    }

    function saveReceiptInSession(receiptId) {
        sessionStorage.setItem('receiptId', receiptId);
    }

    return {
        getActive,
        getEntries,
        createReceipt,
        addEntry,
        deleteEntry,
        getMyReceipts,
        getReceiptDetails,
        commitReceipt,
        saveReceiptInSession,
    };
})();