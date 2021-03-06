import { group, CmdParams as c, notdm, register, extend, aliases } from "../../util/cmdUtils";
import { SafeEmbed } from "../../util/embed/SafeEmbed";
import { MusicQueue } from "../../util/music/MusicQueue";
import { TextChannel } from "discord.js";
import yts from '@caier/yts';
import sc from '@caier/sc';
import { MusicEntry } from "../../util/music/MusicEntry";
import { TrackEntry } from "@caier/sc/out/interfaces";
import { VideoEntry } from "@caier/yts/lib/interfaces";
import { SilentError } from "../../util/errors/errors";
import Utils from "../../util/utils";

export = H;

@notdm
@extend(H.modify)
@group("Muzyka")
class H {
    static modify(msg: c.m, args: c.a, bot: c.b) {
        return [msg, bot.newArgs(msg, {freeargs: 1}), bot, 
                bot.music.getQueue(msg.guild).setOutChan(msg.channel as TextChannel)];
    }

    static embColor = [112, 0, 55];
    static scColor = '#ff8800';
    static emb = (desc?: string, sc?: boolean) => new SafeEmbed().setColor(sc ? H.scColor : H.embColor as any).setAuthor(desc || 'null');
    static gArgs = (msg: c.m, bot: c.b) => bot.newArgs(msg, {freeargs: 1});
    static whatToPlay = (msg: c.m, m?: string) => msg.channel.send(H.emb(m || "Co mam odtworzyć?"));
    static notFound = (msg: c.m) => H.whatToPlay(msg, "Nie znaleziono");
    static whatToSearch = (msg: c.m) => H.whatToPlay(msg, "Co chcesz wyszukać?");

    static async assertVC(msg: c.m, queue?: MusicQueue) {
        if(!msg?.member?.voice?.channel) {
            msg.channel.send(H.emb('Aby korzystać z funkcji muzycznych, wejdź na kanał głosowy'));
            throw new SilentError("Member not in VC");
        }
        if(queue)
            queue.setVC(await msg.member.voice.channel.join());
    }

    @register('dodaje do kolejki (z YT) lub wznawia odtwarzanie kolejki', '`$pplay (co odtworzyć)')
    static async play(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue, top = false, fromSC = false) {
        await H.assertVC(msg, queue);
        if(!args[1] && queue?.playing?.dispatcher?.paused) {
            queue.resume();
            msg.channel.send(H.emb('Wznowiono odtwarzanie ⏯'));
            return;
        }
        else if(!args[1] && queue.queue.length == 0) {
            H.whatToPlay(msg);
            return;
        }
        else if(!args[1]) 
            return;
        let vid = !fromSC ? (await yts(args[1]))?.videos?.[0] : (await sc.search(args[1]))?.tracks?.[0];
        if(!vid) {
            H.notFound(msg);
            return;
        }
        queue.addEntry(new MusicEntry({vid: vid, by: msg.author.username, type: fromSC ? 'sc' : 'yt'}), top);
    }

    @aliases('top')
    @register('dodaje na górę kolejki (z YT)', '`$pplaytop {co odtworzyć}`')
    static async playtop(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        await H.play(msg, args, bot, queue, true);
    }

    @aliases('sc')
    @register('dodaje do kolejki (z SoundCloud)', '`$psoundcloud {co odtworzyć}`')
    static async soundcloud(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        await H.play(msg, args, bot, queue, false, true);
    }

    @aliases('sctop')
    @register('dodaje na górę kolejki (z SoundCloud)', '`$psoundcloudtop {co odtworzyć}`')
    static async soundcloudtop(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        await H.play(msg, args, bot, queue, true, true);
    }

    @aliases('sea')
    @register('dodaje do kolejki wybór z listy', '`$psearch {wyszukanie}`')
    static async search(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue, top = false, fromSC = false) {
        if(!args[1]) {
            H.whatToSearch(msg);
            return;
        }
        await H.assertVC(msg, queue);
        let embed = new bot.RichEmbed().setColor(fromSC ? H.scColor : H.embColor as any).setAuthor("Wyszukanie 🔍").setDescription('\u200b');
        let entries = fromSC ? (await sc.search(args[1]))?.tracks : (await yts(args[1]))?.videos;
        if(!entries || entries?.length == 0) {
            H.notFound(msg);
            return;
        }
        entries.forEach((vid: TrackEntry | VideoEntry, i: number) => {
            embed.addField(`**Kanał: ${vid.author.name}**`, `**\`${i+1}.\` ${vid.name}**\nDługość: ${vid.duration}`);
        });
        msg.channel.send(embed).then(async nmsg => {
            let imsg = await msg.channel.send(H.emb("Napisz numer utworu, który chcesz puścić, lub odpisz `stop` aby anulować wyszukanie", fromSC));
            let eventL: any;
            setTimeout(() => bot.removeListener("message", eventL), 120000);

            bot.on("message", eventL = async (rmsg: c.m) => {
                if(rmsg.author.id != msg.author.id || rmsg.channel.id != msg.channel.id) return;

                if(entries[+rmsg.content - 1]) {
                    queue.addEntry(new MusicEntry({vid: entries[+rmsg.content - 1], by: msg.author.username, queue: queue, type: fromSC ? "sc" : "yt"}), top);
                    rmsg.content = "stop";
                }
                if(rmsg.content == 'stop') {
                    msg.delete({timeout: 150});
                    nmsg.delete({timeout: 150});
                    rmsg.delete({timeout: 150});
                    imsg.delete({timeout: 150});
                    bot.removeListener("message", eventL);
                }
            });
        });
    }

    @aliases('seatop')
    @register('dodaje na górę kolejki wybór z listy', `$psearchtop {wyszukanie}`)
    static async searchtop(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        await H.search(msg, args, bot, queue, true, false);
    }

    @aliases('seasc')
    @register('dodaje do kolejki wybór z listy (z SoundCloud)', '`$psearchsc {wyszukanie}`')
    static async searchsc(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        await H.search(msg, args, bot, queue, false, true);
    }

    @aliases('seasctop')
    @register('dodaje na górę kolejki wybór z listy (z SoundCloud)', '`$psearchsctop {wyszukanie}`')
    static async searchsctop(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        await H.search(msg, args, bot, queue, true, true);
    }

    @register('przechodzi do następnego utworu', '`$pskip (ile skipnąć)`')
    static async skip(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        await H.assertVC(msg);
        if(!queue.playing) {
            msg.channel.send(H.emb('Nie ma czego skipować!'));
            return;
        }
        if(args[1] && !isNaN(+args[1]) && +args[1] > 0)
            queue.queue.splice(0, (+args[1] >= queue.queue.length) ? queue.queue.length - 1 : +args[1]);
        msg.channel.send(H.emb('Skipped ⏩'));
        queue.playNext();
    }

    @register('wstrzymuje kolejkę', '`$ppause`')
    static async pause(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        await H.assertVC(msg);
        if(queue.playing) {
            queue.pause();
            msg.channel.send(H.emb('Zapauzowano ⏸'));
        } else
            msg.channel.send(H.emb('Nie ma czego pauzować!'));
    }

    @aliases('rem')
    @register('usuwa wybrane utwory z kolejki', '`$premove {pozycja w kolejce, lub wiele pozycji oddzielonych spacją, lub "all" aby usunąć wszystkie}`')
    static async remove(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        await H.assertVC(msg);
        if(!args[1]) return;
        args = bot.newArgs(msg);
        args[1] = args.slice(1);
        let wrong = queue.remove(args[1]);
        wrong.length && msg.channel.send(H.emb('Podano błędną pozycję: ' + wrong.join(', ')));
    }

    @register('wyświetla kolejkę', '`$pqueue`')
    static queue(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        if(queue.queue.length > 0 || queue.playing) {
            let emb = new bot.RichEmbed().setColor(H.embColor as any).setAuthor("Kolejka");
            if(queue.playing)
                emb.addField("Teraz odtwarzane:", `${queue.playing.dispatcher.paused ? '⏸' : '▶️'} [**${queue.playing.videoInfo.name}**](${queue.playing.videoInfo.url})` + '\n' + 'Pozostało: ' + queue.playing.timeLeft);
            if(queue.queue.length > 0) {
                emb.addField('\u200b', '**Następnie:**');
                queue.queue.forEach((x, i) =>
                    emb.addField(`Kanał: ${x.videoInfo.author.name}`, `${++i}. [${x.videoInfo.name}](${x.videoInfo.url})`));
                let embs = emb.populateEmbeds();
                if(embs.length > 0)
                    Utils.createPageSelector(msg.channel as TextChannel, embs, {triggers: [msg.author.id]});
                else
                    msg.channel.send(emb);
            } else msg.channel.send(emb);
        }
        else
            msg.channel.send(H.emb('Kolejka jest pusta'));
    }

    @register('wyświetla bieżący utwór', '`$pnow`')
    static now(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        if(queue.playing) {
            let emb = (<SafeEmbed> queue.announce('nextSong', queue.playing, true)).setAuthor('Teraz odtwarzane')
            .spliceFields(-1, 0, [{name: 'Pozostało', value: queue.playing.timeLeft, inline: true},
            {name: 'Stan', value: queue.playing.dispatcher.paused ? '⏸' : '▶️', inline: true}]);
            msg.channel.send(emb);
        }
        else
            msg.channel.send(H.emb('Nic nie jest odtwarzane'));
    }

    @aliases('dq')
    @register('niszczy kolejkę i każdą jej właściwość', '`$pdestroyQueue`')
    static async destroyQueue(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        let conf = await Utils.confirmBox(msg.channel as any, "Ta komenda wyczyści wszyskie właściwości kolejki, jej historię, ustawienia, playlisty itd.\nJeśli chcesz jedynie zatrzymać odtwarzanie, użyj komendy `pause` lub `stop`\n\nCzy na pewno chcesz zniszczyć kolejkę tego serwera?", msg.author);
        if(conf) {
            bot.music.destroyQueue(msg.guild);
            msg.channel.send(H.emb('Zniszczono kolejkę'));
        }
    }

    @register('zatrzymuje odtwarzanie i rozłącza bota', '$pstop')
    static stop(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        queue.stop();
        msg.channel.send(H.emb('Zatrzymano kolejkę ⏹'));
    }

    @aliases('his')
    @register('wyświetla historię odtwarzania serwera', '`$phistory`')
    static history(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        if(queue?.history?.length == 0)
            H.whatToPlay(msg, "Historia odtwarzania jest pusta!");
        else {
            let emb = new SafeEmbed().setColor(H.embColor as any).setAuthor("Historia");
            [...queue.history].reverse().forEach((v, i) => {
                emb.addField(`Kanał: **${v.videoInfo.author.name}**`, `${i+1}. **[${v.videoInfo.name}](${v.videoInfo.url})**`);
            });
            let embs = emb.populateEmbeds();
            if(embs.length > 0)
                Utils.createPageSelector(msg.channel as TextChannel, embs, {triggers: [msg.author.id]});
            else 
                msg.channel.send(emb);
        }
    }

    @aliases('clhis')
    @register('czyści historię odtwarzania', '`$pclearHistory`')
    static clearHistory(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        queue.history = [];
        msg.channel.send(H.emb('Wyczyszczono historię odtwarzania'));
    }

    @aliases('rep')
    @register('ponownie puszcza ostatnią, lub wybraną z historii piosenkę, albo całą historię', '`$prepeat (pozycja w historii, lub wiele pozycji oddzielonych spacją)`\n`$prepeat all` - dodaje do kolejki całą historię (pomijając powtórzenia)\n`$prepeat random (x)` - dodaje do kolejki x utworów z historii')
    static async repeat(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue, top = false) {
        await H.assertVC(msg);
        if(queue.history?.length == 0) {
            msg.channel.send(H.emb('Historia odtwarzania jest pusta!'));
            return;
        }
        args = bot.newArgs(msg);
        await H.assertVC(msg, queue);
        if(!args[1]) {
            let saved = queue.history[queue.history.length - 1];
            queue.addEntry(MusicEntry.fromJSON(saved, msg.author.username), false);
        }
        else if(args[1] == 'all' || args[1] == 'random') {
            let already: string[] = [];
            let entries: MusicEntry[] = queue.history.filter(v => 
                !already.includes(v.videoInfo.url) && already.push(v.videoInfo.url)     
            ).map(v => MusicEntry.fromJSON(v, msg.author.username));
            if(args[1] == 'random')
                entries = Utils.arrayShuffle(entries).slice(0, !isNaN(+args[2]) && +args[2] || 1);
            queue.addEntry(entries, top);
        }
        else {
            args[1] = args.slice(1);
            let wrong = args[1].filter((v: string) => isNaN(+v) || ![...queue.history].reverse()[+v - 1]);
            args[1] = args[1].filter((v: string) => !wrong.includes(v));
            let entries: MusicEntry[] = [];
            for(let entry of args[1]) {
                let saved = [...queue.history].reverse()[+entry - 1];
                entries.push(MusicEntry.fromJSON(saved, msg.author.username));
            }
            queue.addEntry(entries, top);
            wrong.length > 0 && msg.channel.send(H.emb('Podano błędną pozycję: ' + wrong.join(', ')));
        }
    }

    @aliases('aplay')
    @register('włącza/wyłącza autoodtwarzanie następnych utworów', '`$pautoplay`')
    static async autoplay(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        msg.channel.send(H.emb('Autoodtwarzanie nie jest obecnie wspierane'/* queue.toggleAutoplay() ? 'Włączono autoodtwarzanie' : 'Wyłączono autoodtwarzanie' */));
    }

    @register('losowo miesza utwory w kolejce', '`$pshuffle`')
    static shuffle(msg: c.m, args: c.a, bot: c.b, queue: MusicQueue) {
        queue.queue = Utils.arrayShuffle(queue.queue);
        msg.channel.send(H.emb('Pomieszano utwory w kolejce'));
    }
}