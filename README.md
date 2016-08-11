#MKVInfo 

   Sort of "Mediainfo" for MKV / WebM Files - little MKVParser (just for main technics information about the file)

#Dependances : null

#Usage :

    <script src="MKVInfo.js" type="text/javascript" charset="utf-8"></script> 
    (in single file .html)

    importScripts('MKVInfo.js');                                              
    (in worker)


#How use it :

     
            mkv(this.files[0], function(err, info) {
                if (err) {
                    .....
                } else {
                    sortie_texte = human_reading(info);
                    ....
                }
            }); 

  MKVInfo return an object structured (named 'info') wich contains a lot of technicals information about the file.
  If we want to read this informations, we need to make them readable. So human_reading is here !

#Examples :
	
	for a single file and no worker : index.html
	for multiple files and worker   : indexw.html

#Optimisations ?
    Oh Yesssss ! MKVInfo does not calculate the size of each stream because it's too heavy (too slow !). 
    The main optimisation to do is to use a buffer (in this version MKVInfo use a little buffer of 20 bytes length !)

#Try it ? 
    http://aroug.eu/MKVInfo/   (multiple + worker + use MKVInfo.min.js)    
    
#Troubles with Firefox or Internet Explorer ? 
    Try index.html ! (indexw.html is good with Chrome ^_^ )    
