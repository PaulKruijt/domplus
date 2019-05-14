td.watchers['product'] = {
    amount: function (value, data) {
        const total = value * parseFloat(data.price);
        data.total = new Intl.NumberFormat('nl-NL', {
            style: 'currency',
            currency: 'EUR'
        }).format(total).substr(2, total.length);

        return value;
    }
}