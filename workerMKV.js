importScripts('MKVInfo.min.js');
// seules petites evolutions :
// prise en compte de l'indice du fichier transmis dans le message (lnum) pour pouvoir le retourner à l'appelant et
// présentation du retour : suppression des lignes "more info" pour les Codecs Audio et Video
// date : 2020/12/14

        function duree(s) {

            function onetotwo(Pint) {
                if (Pint < 10) {
                    return '0' + Pint.toString();
                } else {
                    return Pint.toString();
                }
            }

            function onetothree(Pint) {
                if (Pint < 10) {
                    return '00' + Pint.toString();
                } else {
                    if (Pint < 100) {
                        return '0' + Pint.toString();
                    } else {
                        return Pint.toString();
                    }
                }
            }

            let out = '';
            let lhh = '';
            let lmn = '';
            let lss = '';
            let lms = '';
            lhh = Math.floor(s / 3600);
            lmn = Math.floor((s - lhh * 3600) / 60);
            lss = Math.floor(s - lhh * 3600 - lmn * 60);
            lms = Math.ceil((s - lhh * 3600 - lmn * 60 - lss) * 1000);
            if (lhh > 0) {
                lhh = lhh.toString() + ":";
                out = lhh;
            }
            if (lmn > 0) {
                if (out.length == 0) {
                    out = lmn.toString() + ":";
                } else {
                    out = out + onetotwo(lmn) + ":";
                }
            } else {
                if (out.length > 0) {
                    out = out + "00:";
                }
            }
            if (lss > 0) {
                if (out.length == 0) {
                    out = lss.toString();
                } else {
                    out = out + onetotwo(lss);
                }
            } else {
                if (out.length == 0) {
                    out = "0";
                } else {
                    out = out + "00";
                }
            }
            if (lms != 0) {
                out = out + '.' + onetothree(lms);
            }
            return out;
        }

        function humanFileSize(size) {
            let i = Math.floor(Math.log(size) / Math.log(1024));
            return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['o', 'ko', 'Mo', 'Go', 'To'][i];
        };

        function humanBitrate(size) {
            let i = Math.floor(Math.log(size) / Math.log(1024));
            return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['bps', 'kbps', 'Mbps', 'Gbps', 'Tbps'][i];
        };

        function human_reading(info) {
            info.text = "ArouG's MKV/WebM Infos :\n";
            info.text += "-------------------\n";
            info.text += "File : " + info.filename + "\n";

            let d= new Date(info.filedate);    
            info.text += "Date : " + (d.getFullYear()) + '/' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + d.getMinutes() + "\n";
            info.text += "Size : " + humanFileSize(info.filesize) + "\n";
            info.text += "Format : "+info.typemovie+"\n";
            if (info.UID){
                info.text += "UniqueID : "+info.UID+"\n";
            }
            if (info.WritingLibrary) {
                info.text += "Writing library : "+info.WritingLibrary+"\n";
            } 
            info.text += "Duration : " + duree(info.dureeS) + "\n";
            GlobBitrate = 8 * info.filesize / info.dureeS;
            info.text += "Global bitrate : " + humanBitrate(GlobBitrate) + "\n";
            if (info.Creator){
                info.text += "Creator : " + info.Creator + "\n";
            }    
            info.text += "Count of streams : " + info.tracks.length + "\n";
            info.text += "\n";

            for (let i = 0; i < info.tracks.length; i++) {
                if (info.tracks[i].typeEnt == 'Video'){
                    info.text += "Video :\n";
                }
                if (info.tracks[i].typeEnt == 'Audio'){
                    info.text += "Audio :\n";
                }
                if (info.tracks[i].typeEnt == 'Subtitles'){
                    info.text += "Subtitles :\n";
                }
                info.text += "Track number " + info.tracks[i].Id + "\n";
                if (info.tracks[i].typeEnt == 'Video' && (info.tracks[i].ConstantFramerate)){
                    let nbf=parseInt(info.dureeS * info.tracks[i].ConstantFramerate) + 1;
                    info.text += "Count of samples : " + nbf + "\n";
                }
                if (info.tracks[i].langage){
                    info.text += "Langage : " + info.tracks[i].langage + "\n";
                }
                if (info.tracks[i].name){
                    info.text += "Name : " + info.tracks[i].name + "\n";
                }
                info.text += "Default : " + info.tracks[i].default + "\n";
                info.text += "Forced : " + info.tracks[i].forced + "\n";
                if (info.tracks[i].typeEnt == 'Video') {
                    if (info.tracks[i].ConstantFramerate){
                        info.text += "Framerate : " + parseInt(info.tracks[i].ConstantFramerate * 1000) / 1000 + " FPS\n";
                    }
                    if (info.tracks[i].Swidth){
                        info.text += "Width on screen : " + info.tracks[i].Swidth + "\n";
                        info.text += "Heidth on screen : " + info.tracks[i].Sheight + "\n";
                    }
                    info.text += "Width in file : " + info.tracks[i].width + "\n";
                    info.text += "Heidth in file : " + info.tracks[i].height + "\n";
                    if (info.tracks[i].CodeC) {
                        //info.text += "Codec Video more info :\n";
                        info.text += "CodeC : " + info.tracks[i].CodeC + "\n";
                    }
                }

                if (info.tracks[i].typeEnt == 'Audio') {
                    if (info.tracks[i].CodeC) {
                        //info.text += "Codec Audio more info :\n";
                        info.text += "CodeC : " + info.tracks[i].CodeC + "\n";
                    }
                    info.text += "Count of channels : " + info.tracks[i].nbChannels + "\n";
                    info.text += "SampleRate : " + info.tracks[i].Freq + "\n";
                }
                if (info.tracks[i].typeEnt == 'Subtitles') {
                    if (info.tracks[i].CodeC) {
                        info.text += "CodeC : " + info.tracks[i].CodeC + "\n";
                    }
                }
                info.text += "\n";
            }
            return info.text;
        }


onmessage = function(event) {

  let file = event.data[0];
  let lfname=file.name.toLowerCase();
  let lnum = event.data[1];
  let mkvregex = new RegExp("(.*?)\.(mkv|webm)$");  

    //if (file.type == 'video/x-matroska' || file.type == 'video/webm' || mkvregex.test(lfname)){ 
    if (file.type == 'video/x-matroska' || file.type == 'video/webm'){ 
        mkv(file, function(err, info) {
          if (err) {
            //console.log('error : ' + err);
            postMessage({
              'data' : 'error : ' + err, 
              'num' : lnum
            });
          } else {
            sortie_texte = human_reading(info);
            postMessage({
              'data' : sortie_texte,
              'num' : lnum
            });
            //console.log(sortie_texte);
          }
        });
    } else {
        postMessage({'data' : 'nop', 'num' : lnum});
    }   
  }
