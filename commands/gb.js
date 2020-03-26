const { fromGB } = require("../searchMethods");

module.exports = {
    name: 'gb',
    description: 'G E L B O O R U - obrazki thotów na wyciągnięcie ręki',
    usage: '`$pgb {wyszukanie} | (opcjonalnie){ilość wyników max. 10}` - zobacz sam',
    cooldown: 30000,
    async execute(msg, args, bot)
    {
        args = bot.getArgs(msg.content, msg.prefix, "|", 1);
        const color = "#006ffa";

        msg.channel.send(bot.embgen(color, `Zbieranie postów...`)).then(async msgn => 
        {
            let imgs = (args[1] == '') ? await fromGB(null, args[2]) : (!args[1]) ? await fromGB() : (args[2]) ? await fromGB(args[1], args[2]) : await fromGB(args[1]); 
     
            for (let x of imgs)
            {
                let embed = new bot.RichEmbed();
                if(x.tags != "video")
                {
                    embed.setFooter(x.tags).setImage(x.link).setTitle((!args[1] || args[1] == '') ? "random" : args[1]).setURL(x.page).setColor(color).setAuthor("Gelbooru", "https://pbs.twimg.com/profile_images/1118350008003301381/3gG6lQMl.png", "http://gelbooru.com/");
                    if(x.comments != 0 && x.comments[0].comment.length < 1000) embed.addField(`${x.comments[0].name}:`, x.comments[0].comment);
                } 
                else embed = x.link;

                msg.channel.send(embed).then(async nmsg => {
                    if(x.comments.length <= 1) return;

                    for(let emo of [`⏮`, `◀`, `▶`])
                        await nmsg.react(emo);

                    let eventL;
                    let page = 0;
                    let combeds = [new bot.RichEmbed().setTitle("Komentarze").setColor(color)];
                    setTimeout(() => bot.removeListener("messageReactionAdd", eventL), 120000);

                    for(let c of x.comments) {
                        while(true) {
                            let emb = combeds[combeds.length - 1]
                            if(c.comment.length > 1023) 
                                c.comment = c.comment.slice(0, 1020) + "...";
                            if(emb.fields.length < 25 && emb.length + c.name.length + c.score.toString().length + c.comment.length < 5990) {
                                emb.addField(`${c.score}👍  ${c.name}:`, c.comment);
                                break;
                            } 
                            else combeds.push(new bot.RichEmbed().setTitle("Komentarze").setColor(color));
                        }
                    }

                    for(let e = 1; e-1 < combeds.length; e++)
                        combeds[e-1].setFooter(`${e}/${combeds.length}`)

                    bot.on("messageReactionAdd", eventL = async (react, user) => {
                        if(react.message.id != nmsg.id || user.id == bot.user.id) return;
                        let emoji = react.emoji.toString();
                        react.users.remove(user.id);

                        if(emoji == `⏮`) {
                            nmsg.edit(embed);
                            page = 0;
                        }
                        else if ((emoji == `◀` && page > 0) || (emoji == `▶` && page < combeds.length)) {
                            page = (emoji == `◀`) ? page - 1 : page + 1;
                            nmsg.edit((page <= 0) ? embed : combeds[page-1]);
                        }
                    });
                })
            }
    
            if(imgs == 0) msgn.edit(bot.embgen(color, `**${msg.author.tag}** nie znaleziono!`));
            else msgn.delete({timeout: 150});
        });
    }
}