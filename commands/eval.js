const fs = require('fs-extra');
const path = require('path');
const rp = require('request-promise');

module.exports = {
    name: 'eval',
    description: '',
    usage: '',
    ownerOnly: true,
    execute(msg, args, bot)
    {
        let code = msg.content.slice(msg.prefix.length + this.name.length);
        try {
            eval(code);
        } catch(err) {
            msg.channel.send('Nastąpił błąd podczas ewaluacji wyrażenia:\n\n' + err.stack.split('\n').slice(0, 5).join('\n'), {split: true, code: true});
        }
    }
}