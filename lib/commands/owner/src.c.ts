import { group, ownerOnly, register, CmdParams as c } from "../../util/cmdUtils";
import fs from 'fs-extra';
// @ts-ignore
import zip from 'nodeJs-zip';
import path from 'path';
import rp from 'request-promise';

@ownerOnly
@group("Bot owner")
class Handler {
    @register('ściąga pliki źródłowe i dane bota', '`$psrc ls` - wysyła listę plików w katalogu głównym bota\n`$psrc ls {ścieżka katalogu}` - wysyła listę plików w podanym katalogu\n`$psrc dl {ścieżka do pliku}` - wysyła podany plik, o ile plik nie jest oznaczony jako tajny\n`$psrc rm {ścieżka pliku}` - usuwa plik lub katalog, *tylko owner bota*\n`$psrc up` - wysyła plik do systemu plików bota - *tylko owner bota*')
    static src(msg: c.m, args: c.a, bot: c.b)
    {
        let emb = (desc?: string) => {
            return desc && new bot.RichEmbed().setColor("#4782b3").setDescription(desc) || new bot.RichEmbed().setColor("#4782b3");
        }

        args = bot.getArgs(msg.content, msg.prefix, "|", 2);
        let mainDir = path.join(process.cwd());

        if(args[1] == 'ls') {
            let dir = path.join(mainDir, args[2] || "");
            if(!dir.includes(mainDir))
                dir = mainDir;
            let files = fs.readdirSync(dir);
            files.forEach((val, i, obj) => {
                if(fs.statSync(path.join(dir, val)).isDirectory())
                    obj[i] = "....." + obj[i] + "/";
            });
            files.sort((a: string,b: string) => a.toLowerCase().localeCompare(b.toLowerCase()));
            files.forEach((v: string,i: string | number,o: { [x: string]: any; }) => o[i] = v.startsWith(".....") && o[i].slice(5) || o[i]);

            dir = dir.replace(mainDir, "") || "głównym";
            let out = emb().setTitle(`**Pliki w katalogu ${dir}:**`);
            let str = '';
            for(let x of files)
                str += x + '\n';
            if(str.length < 2040) {
                out.setDescription(str);
                msg.channel.send(out);
            } else
                msg.channel.send(`**Pliki w katalogu ${dir}:**\n${str}`, {split: true});
        }

        else if(args[1] == 'dl') {
            if(!args[2]) {
                msg.channel.send(emb("Kompresowanie...")).then(async nmsg => {
                    zip.zip(mainDir, {name: 'mokkun-serv', filter: true}, (n: string | string[]) => !n.includes("node_modules"));
                    await msg.channel.send("", {files: [path.join(mainDir, "mokkun-serv.zip")]});
                    nmsg.delete({timeout: 150});
                    fs.unlinkSync(path.join(mainDir, "mokkun-serv.zip"));
                });
                return;
            }

            fs.existsSync(path.join(mainDir, args[2]))
            && msg.channel.send("", {files: [path.join(mainDir, args[2])]});
        }

        else if(args[1] == 'rm' && args[2]) {
            let dir = path.join(mainDir, args[2]);
            if(!dir.includes(mainDir) || dir == mainDir || dir == path.join(mainDir, "/") || !fs.existsSync(dir)) return;
            fs.removeSync(dir);
            msg.channel.send(emb(`Usunięto plik/katalog **${args[2]}**`));
        }

        else if(args[1] == 'up') {
            let attch = msg.attachments.array();
            if(!attch[0]) return;
            let dir = path.join(mainDir, args[2] || "");
            if(!dir.includes(mainDir))
                dir = mainDir;
            if(!fs.statSync(dir).isDirectory()) return;
            let savestr = fs.createWriteStream(path.join(dir, attch[0].url.slice(attch[0].url.lastIndexOf("/"))));
            rp.get(attch[0].url).on('data', (data: any) => savestr.write(data)).then(() =>
                msg.channel.send(emb("Wysłano plik")));
        }
    }
}

export = Handler;