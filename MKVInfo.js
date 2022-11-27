/**
 * MKVInfo 
 * v 5.0   2020/12/12
 *         2020/12/20    rebug date : lastModifiedDate (deprecate) => lastModified ET remontée du nombre d'accès disque
 *                                    rajouter tags 55b0- 55bd + quelques contrôles permettant de remonter les erreurs rencontrées sur de mauvais fichiers :-)
 * v 6.0   2021/02/11    rebug : cas de Jodorowsky's Dune (Element de type 'm' - Master - et de dataSize = 0  : ContentCompression en l'occurence)
                                cas de Trahie : multiples éléments de type 'info' avec 1 seul possédant 'duration' 
 * v 7.0   2022/11/26    rebug : cas de Enola Holmes 2 : rajout de tags manquants    
 * v 8.0   2022/11/27    aucun bug mais décision d'intégrer tous les tags selon ref 4 ci-dessous  EN conservant les anciens !                 
 *       Documentation :
 *          https://www.ffmpeg.org/doxygen/2.1/matroska_8h_source.html
 *          https://github.com/themasch/node-ebml
 *          https://permadi.com/2010/06/webm-file-structure/
 *          https://www.matroska.org/technical/elements.html <-- liste des tags
 *          https://www.matroska.org/technical/specs/index.html
 *          https://matroska.org/files/matroska.pdf
 *          https://fr.wikipedia.org/wiki/IEEE_754
 *          http://www.h-schmidt.net/FloatConverter/IEEE754.html
 *          https://stackoverflow.com/questions/43933735/conversion-utf-8-uint8array-to-utf-8-string
 *          https://fr.w3docs.com/snippets/javascript/comment-detecter-internet-explorer-en-javascript.html
 *          http://openvibe.inria.fr/documentation/1.3.0/Doc_ParsingEBMLStreams.html
 */
"use strict";

var mkv = function(opts, fcb) {
    var info = {};
        info.file = opts;
        info.filesize = info.file.size;
        info.filename = info.file.name;
        info.filedate = info.file.lastModified;
        info.offset = 0;
        info.tracks = [];
        info.JUNKS = []; //  for stocking JUNKS boxes to be devared after replacing values !
        info.noVal = []; //  for stocking boxes where values not obtained during boxes parsing
        info.lengthmax = 128; // could be adapted !!
        info.nbboucleslect = 0; // number of acces to blob.slice.read

    var MKVebml = {};


    MKVebml.parse = async function(fcb) {

        var schema = {
            "42f2": { "name": "EBMLMaxIDLength", "type": "u"},
            "42f3": { "name": "EBMLMaxSizeLength", "type": "u"},
            "18538067": { "name": "Segment", "type": "m"},
            "114d9b74": { "name": "SeekHead", "type": "m"},
            "4dbb": { "name": "Seek", "type": "m"},
            "53ab": { "name": "SeekID", "type": "b"},
            "53ac": { "name": "SeekPosition", "type": "u"},
            "1549a966": { "name": "Info", "type": "m"},
            "73a4": { "name": "SegmentUUID", "type": "b"},
            "7384": { "name": "SegmentFilename", "type": "8"},
            "3cb923": { "name": "PrevUUID", "type": "b"},
            "3c83ab": { "name": "PrevFilename", "type": "8"},
            "3eb923": { "name": "NextUUID", "type": "b"},
            "3e83bb": { "name": "NextFilename", "type": "8"},
            "4444": { "name": "SegmentFamily", "type": "b"},
            "6924": { "name": "ChapterTranslate", "type": "m"},
            "69a5": { "name": "ChapterTranslateID", "type": "b"},
            "69bf": { "name": "ChapterTranslateCodec", "type": "u"},
            "69fc": { "name": "ChapterTranslateEditionUID", "type": "u"},
            "2ad7b1": { "name": "TimestampScale", "type": "u"},
            "4489": { "name": "Duration", "type": "f"},
            "4461": { "name": "DateUTC", "type": "d"},
            "7ba9": { "name": "Title", "type": "8"},
            "4d80": { "name": "MuxingApp", "type": "8"},
            "5741": { "name": "WritingApp", "type": "8"},
            "1f43b675": { "name": "Cluster", "type": "m"},
            "e7": { "name": "Timestamp", "type": "u"},
            "5854": { "name": "SilentTracks", "type": "m"},
            "58d7": { "name": "SilentTrackNumber", "type": "u"},
            "a7": { "name": "Position", "type": "u"},
            "ab": { "name": "PrevSize", "type": "u"},
            "a3": { "name": "SimpleBlock", "type": "b"},
            "a0": { "name": "BlockGroup", "type": "m"},
            "a1": { "name": "Block", "type": "b"},
            "a2": { "name": "BlockVirtual", "type": "b"},
            "75a1": { "name": "BlockAdditions", "type": "m"},
            "a6": { "name": "BlockMore", "type": "m"},
            "a5": { "name": "BlockAdditional", "type": "b"},
            "ee": { "name": "BlockAddID", "type": "u"},
            "9b": { "name": "BlockDuration", "type": "u"},
            "fa": { "name": "ReferencePriority", "type": "u"},
            "fb": { "name": "ReferenceBlock", "type": "i"},
            "fd": { "name": "ReferenceVirtual", "type": "i"},
            "a4": { "name": "CodecState", "type": "b"},
            "75a2": { "name": "DiscardPadding", "type": "i"},
            "8e": { "name": "Slices", "type": "m"},
            "e8": { "name": "TimeSlice", "type": "m"},
            "cc": { "name": "LaceNumber", "type": "u"},
            "cd": { "name": "FrameNumber", "type": "u"},
            "cb": { "name": "BlockAdditionID", "type": "u"},
            "ce": { "name": "Delay", "type": "u"},
            "cf": { "name": "SliceDuration", "type": "u"},
            "c8": { "name": "ReferenceFrame", "type": "m"},
            "c9": { "name": "ReferenceOffset", "type": "u"},
            "ca": { "name": "ReferenceTimestamp", "type": "u"},
            "af": { "name": "EncryptedBlock", "type": "b"},
            "1654ae6b": { "name": "Tracks", "type": "m"},
            "ae": { "name": "TrackEntry", "type": "m"},
            "d7": { "name": "TrackNumber", "type": "u"},
            "73c5": { "name": "TrackUID", "type": "u"},
            "83": { "name": "TrackType", "type": "u"},
            "b9": { "name": "FlagEnabled", "type": "u"},
            "88": { "name": "FlagDefault", "type": "u"},
            "55aa": { "name": "FlagForced", "type": "u"},
            "55ab": { "name": "FlagHearingImpaired", "type": "u"},
            "55ac": { "name": "FlagVisualImpaired", "type": "u"},
            "55ad": { "name": "FlagTextDescriptions", "type": "u"},
            "55ae": { "name": "FlagOriginal", "type": "u"},
            "55af": { "name": "FlagCommentary", "type": "u"},
            "9c": { "name": "FlagLacing", "type": "u"},
            "6de7": { "name": "MinCache", "type": "u"},
            "6df8": { "name": "MaxCache", "type": "u"},
            "23e383": { "name": "DefaultDuration", "type": "u"},
            "234e7a": { "name": "DefaultDecodedFieldDuration", "type": "u"},
            "23314f": { "name": "TrackTimestampScale", "type": "f"},
            "537f": { "name": "TrackOffset", "type": "i"},
            "55ee": { "name": "MaxBlockAdditionID", "type": "u"},
            "41e4": { "name": "BlockAdditionMapping", "type": "m"},
            "41f0": { "name": "BlockAddIDValue", "type": "u"},
            "41a4": { "name": "BlockAddIDName", "type": "s"},
            "41e7": { "name": "BlockAddIDType", "type": "u"},
            "41ed": { "name": "BlockAddIDExtraData", "type": "b"},
            "536e": { "name": "Name", "type": "8"},
            "22b59c": { "name": "Language", "type": "s"},
            "22b59d": { "name": "LanguageBCP47", "type": "s"},
            "86": { "name": "CodecID", "type": "s"},
            "63a2": { "name": "CodecPrivate", "type": "b"},
            "258688": { "name": "CodecName", "type": "8"},
            "7446": { "name": "AttachmentLink", "type": "u"},
            "3a9697": { "name": "CodecSettings", "type": "8"},
            "3b4040": { "name": "CodecInfoURL", "type": "s"},
            "26b240": { "name": "CodecDownloadURL", "type": "s"},
            "aa": { "name": "CodecDecodeAll", "type": "u"},
            "6fab": { "name": "TrackOverlay", "type": "u"},
            "56aa": { "name": "CodecDelay", "type": "u"},
            "56bb": { "name": "SeekPreRoll", "type": "u"},
            "6624": { "name": "TrackTranslate", "type": "m"},
            "66a5": { "name": "TrackTranslateTrackID", "type": "b"},
            "66bf": { "name": "TrackTranslateCodec", "type": "u"},
            "66fc": { "name": "TrackTranslateEditionUID", "type": "u"},
            "e0": { "name": "Video", "type": "m"},
            "9a": { "name": "FlagInterlaced", "type": "u"},
            "9d": { "name": "FieldOrder", "type": "u"},
            "53b8": { "name": "StereoMode", "type": "u"},
            "53c0": { "name": "AlphaMode", "type": "u"},
            "53b9": { "name": "OldStereoMode", "type": "u"},
            "b0": { "name": "PixelWidth", "type": "u"},
            "ba": { "name": "PixelHeight", "type": "u"},
            "54aa": { "name": "PixelCropBottom", "type": "u"},
            "54bb": { "name": "PixelCropTop", "type": "u"},
            "54cc": { "name": "PixelCropLeft", "type": "u"},
            "54dd": { "name": "PixelCropRight", "type": "u"},
            "54b0": { "name": "DisplayWidth", "type": "u"},
            "54ba": { "name": "DisplayHeight", "type": "u"},
            "54b2": { "name": "DisplayUnit", "type": "u"},
            "54b3": { "name": "AspectRatioType", "type": "u"},
            "2eb524": { "name": "UncompressedFourCC", "type": "b"},
            "2fb523": { "name": "GammaValue", "type": "f"},
            "2383e3": { "name": "FrameRate", "type": "f"},
            "55b0": { "name": "Colour", "type": "m"},
            "55b1": { "name": "MatrixCoefficients", "type": "u"},
            "55b2": { "name": "BitsPerChannel", "type": "u"},
            "55b3": { "name": "ChromaSubsamplingHorz", "type": "u"},
            "55b4": { "name": "ChromaSubsamplingVert", "type": "u"},
            "55b5": { "name": "CbSubsamplingHorz", "type": "u"},
            "55b6": { "name": "CbSubsamplingVert", "type": "u"},
            "55b7": { "name": "ChromaSitingHorz", "type": "u"},
            "55b8": { "name": "ChromaSitingVert", "type": "u"},
            "55b9": { "name": "Range", "type": "u"},
            "55ba": { "name": "TransferCharacteristics", "type": "u"},
            "55bb": { "name": "Primaries", "type": "u"},
            "55bc": { "name": "MaxCLL", "type": "u"},
            "55bd": { "name": "MaxFALL", "type": "u"},
            "55d0": { "name": "MasteringMetadata", "type": "m"},
            "55d1": { "name": "PrimaryRChromaticityX", "type": "f"},
            "55d2": { "name": "PrimaryRChromaticityY", "type": "f"},
            "55d3": { "name": "PrimaryGChromaticityX", "type": "f"},
            "55d4": { "name": "PrimaryGChromaticityY", "type": "f"},
            "55d5": { "name": "PrimaryBChromaticityX", "type": "f"},
            "55d6": { "name": "PrimaryBChromaticityY", "type": "f"},
            "55d7": { "name": "WhitePointChromaticityX", "type": "f"},
            "55d8": { "name": "WhitePointChromaticityY", "type": "f"},
            "55d9": { "name": "LuminanceMax", "type": "f"},
            "55da": { "name": "LuminanceMin", "type": "f"},
            "7670": { "name": "Projection", "type": "m"},
            "7671": { "name": "ProjectionType", "type": "u"},
            "7672": { "name": "ProjectionPrivate", "type": "b"},
            "7673": { "name": "ProjectionPoseYaw", "type": "f"},
            "7674": { "name": "ProjectionPosePitch", "type": "f"},
            "7675": { "name": "ProjectionPoseRoll", "type": "f"},
            "e1": { "name": "Audio", "type": "m"},
            "b5": { "name": "SamplingFrequency", "type": "f"},
            "78b5": { "name": "OutputSamplingFrequency", "type": "f"},
            "9f": { "name": "Channels", "type": "u"},
            "7d7b": { "name": "ChannelPositions", "type": "b"},
            "6264": { "name": "BitDepth", "type": "u"},
            "52f1": { "name": "Emphasis", "type": "u"},
            "e2": { "name": "TrackOperation", "type": "m"},
            "e3": { "name": "TrackCombinePlanes", "type": "m"},
            "e4": { "name": "TrackPlane", "type": "m"},
            "e5": { "name": "TrackPlaneUID", "type": "u"},
            "e6": { "name": "TrackPlaneType", "type": "u"},
            "e9": { "name": "TrackJoinBlocks", "type": "m"},
            "ed": { "name": "TrackJoinUID", "type": "u"},
            "c0": { "name": "TrickTrackUID", "type": "u"},
            "c1": { "name": "TrickTrackSegmentUID", "type": "b"},
            "c6": { "name": "TrickTrackFlag", "type": "u"},
            "c7": { "name": "TrickMasterTrackUID", "type": "u"},
            "c4": { "name": "TrickMasterTrackSegmentUID", "type": "b"},
            "6d80": { "name": "ContentEncodings", "type": "m"},
            "6240": { "name": "ContentEncoding", "type": "m"},
            "5031": { "name": "ContentEncodingOrder", "type": "u"},
            "5032": { "name": "ContentEncodingScope", "type": "u"},
            "5033": { "name": "ContentEncodingType", "type": "u"},
            "5034": { "name": "ContentCompression", "type": "m"},
            "4254": { "name": "ContentCompAlgo", "type": "u"},
            "4255": { "name": "ContentCompSettings", "type": "b"},
            "5035": { "name": "ContentEncryption", "type": "m"},
            "47e1": { "name": "ContentEncAlgo", "type": "u"},
            "47e2": { "name": "ContentEncKeyID", "type": "b"},
            "47e7": { "name": "ContentEncAESSettings", "type": "m"},
            "47e8": { "name": "AESSettingsCipherMode", "type": "u"},
            "47e3": { "name": "ContentSignature", "type": "b"},
            "47e4": { "name": "ContentSigKeyID", "type": "b"},
            "47e5": { "name": "ContentSigAlgo", "type": "u"},
            "47e6": { "name": "ContentSigHashAlgo", "type": "u"},
            "1c53bb6b": { "name": "Cues", "type": "m"},
            "bb": { "name": "CuePoint", "type": "m"},
            "b3": { "name": "CueTime", "type": "u"},
            "b7": { "name": "CueTrackPositions", "type": "m"},
            "f7": { "name": "CueTrack", "type": "u"},
            "f1": { "name": "CueClusterPosition", "type": "u"},
            "f0": { "name": "CueRelativePosition", "type": "u"},
            "b2": { "name": "CueDuration", "type": "u"},
            "5378": { "name": "CueBlockNumber", "type": "u"},
            "ea": { "name": "CueCodecState", "type": "u"},
            "db": { "name": "CueReference", "type": "m"},
            "96": { "name": "CueRefTime", "type": "u"},
            "97": { "name": "CueRefCluster", "type": "u"},
            "535f": { "name": "CueRefNumber", "type": "u"},
            "eb": { "name": "CueRefCodecState", "type": "u"},
            "1941a469": { "name": "Attachments", "type": "m"},
            "61a7": { "name": "AttachedFile", "type": "m"},
            "467e": { "name": "FileDescription", "type": "8"},
            "466e": { "name": "FileName", "type": "8"},
            "4660": { "name": "FileMediaType", "type": "s"},
            "465c": { "name": "FileData", "type": "b"},
            "46ae": { "name": "FileUID", "type": "u"},
            "4675": { "name": "FileReferral", "type": "b"},
            "4661": { "name": "FileUsedStartTime", "type": "u"},
            "4662": { "name": "FileUsedEndTime", "type": "u"},
            "1043a770": { "name": "Chapters", "type": "m"},
            "45b9": { "name": "EditionEntry", "type": "m"},
            "45bc": { "name": "EditionUID", "type": "u"},
            "45bd": { "name": "EditionFlagHidden", "type": "u"},
            "45db": { "name": "EditionFlagDefault", "type": "u"},
            "45dd": { "name": "EditionFlagOrdered", "type": "u"},
            "4520": { "name": "EditionDisplay", "type": "m"},
            "4521": { "name": "EditionString", "type": "8"},
            "45e4": { "name": "EditionLanguageIETF", "type": "s"},
            "b6": { "name": "ChapterAtom", "type": "m"},
            "73c4": { "name": "ChapterUID", "type": "u"},
            "5654": { "name": "ChapterStringUID", "type": "8"},
            "91": { "name": "ChapterTimeStart", "type": "u"},
            "92": { "name": "ChapterTimeEnd", "type": "u"},
            "98": { "name": "ChapterFlagHidden", "type": "u"},
            "4598": { "name": "ChapterFlagEnabled", "type": "u"},
            "6e67": { "name": "ChapterSegmentUUID", "type": "b"},
            "4588": { "name": "ChapterSkipType", "type": "u"},
            "6ebc": { "name": "ChapterSegmentEditionUID", "type": "u"},
            "63c3": { "name": "ChapterPhysicalEquiv", "type": "u"},
            "8f": { "name": "ChapterTrack", "type": "m"},
            "89": { "name": "ChapterTrackUID", "type": "u"},
            "80": { "name": "ChapterDisplay", "type": "m"},
            "85": { "name": "ChapString", "type": "8"},
            "437c": { "name": "ChapLanguage", "type": "s"},
            "437d": { "name": "ChapLanguageBCP47", "type": "s"},
            "437e": { "name": "ChapCountry", "type": "s"},
            "6944": { "name": "ChapProcess", "type": "m"},
            "6955": { "name": "ChapProcessCodecID", "type": "u"},
            "450d": { "name": "ChapProcessPrivate", "type": "b"},
            "6911": { "name": "ChapProcessCommand", "type": "m"},
            "6922": { "name": "ChapProcessTime", "type": "u"},
            "6933": { "name": "ChapProcessData", "type": "b"},
            "1254c367": { "name": "Tags", "type": "m"},
            "7373": { "name": "Tag", "type": "m"},
            "63c0": { "name": "Targets", "type": "m"},
            "68ca": { "name": "TargetTypeValue", "type": "u"},
            "63ca": { "name": "TargetType", "type": "s"},
            "63c5": { "name": "TagTrackUID", "type": "u"},
            "63c9": { "name": "TagEditionUID", "type": "u"},
            "63c4": { "name": "TagChapterUID", "type": "u"},
            "63c6": { "name": "TagAttachmentUID", "type": "u"},
            "67c8": { "name": "SimpleTag", "type": "m"},
            "45a3": { "name": "TagName", "type": "8"},
            "447a": { "name": "TagLanguage", "type": "s"},
            "447b": { "name": "TagLanguageBCP47", "type": "s"},
            "4484": { "name": "TagDefault", "type": "u"},
            "44b4": { "name": "TagDefaultBogus", "type": "u"},
            "4487": { "name": "TagString", "type": "8"},
            "4485": { "name": "TagBinary", "type": "b"},
            //---------------------- old tags  voir ebml.db -------------------------//
            "4282": { "name": "DocType", "type": "s"},
            "4285": { "name": "DocTypeReadVersion", "type": "u"},
            "4286": { "name": "EBMLVersion", "type": "u"},
            "4287": { "name": "DocTypeVersion", "type": "u"},
            "6532": { "name": "SignedElement", "type": "b"},
            "2ad7b2": { "name":     "TimecodeScaleDenominator", "type": "u"},
            "7e7b": { "name": "SignatureElementList", "type": "m"},
            "7e5b": { "name": "SignatureElements", "type": "m"},
            "7eb5": { "name": "Signature", "type": "b"},
            "7ea5": { "name": "SignaturePublicKey", "type": "b"},
            "7e9a": { "name": "SignatureHash", "type": "u"},
            "7e8a": { "name": "SignatureAlgo", "type": "u"},
            "1b538667": { "name": "SignatureSlot", "type": "m"},
            "bf": { "name":     "CRC-32", "type": "b"},
            "ec": { "name":     "Void", "type": "b"},
            "42f7": { "name": "EBMLReadVersion", "type": "u"},
            "1a45dfa3": { "name": "EBML", "type": "m"}

        }; // definition de schema

        function singleprec(val) {
            var sig, exp, mexp, mant, nmant, tmp; // 1, 8, 23
            sig = parseInt(val / Math.pow(2, 31));
            exp = parseInt(val / Math.pow(2, 23)) - (sig * Math.pow(2, 9));
            mant = val - (exp * Math.pow(2, 23)) - (sig * Math.pow(2, 31));
            nmant = mant.toString(2);
            tmp = 1;
            for (var k = 0; k < nmant.length; k++) {
                if (nmant[nmant.length - 1 - k] == '1') {
                    tmp += Math.pow(2, -23 + k);
                }
            }
            nmant = tmp;
            mexp = exp.toString(2);
            tmp = 0;
            for (var k = 0; k < mexp.length; k++) {
                if (mexp[mexp.length - 1 - k] == '1') {
                    tmp += Math.pow(2, k);
                }
            }
            mexp = tmp;
            tmp = Math.pow(2, mexp - 127) * nmant;
            if (sig == 1) tmp = -tmp;
            return tmp;
        } // singleprec

        function doubleprec(val) { // 1, 11, 52
            var sig, exp, mexp, mant, nmant, tmp;
            sig = parseInt(val / Math.pow(2, 63));
            exp = parseInt(val / Math.pow(2, 52)) - (sig * Math.pow(2, 12));
            mant = val - (exp * Math.pow(2, 52)) - (sig * Math.pow(2, 63));
            nmant = mant.toString(2);
            tmp = 1;
            for (var k = 0; k < nmant.length; k++) {
                if (nmant[nmant.length - 1 - k] == '1') {
                    tmp += Math.pow(2, -52 + k);
                }
            }
            nmant = tmp;
            mexp = exp.toString(2);
            tmp = 0;
            for (var k = 0; k < mexp.length; k++) {
                if (mexp[mexp.length - 1 - k] == '1') {
                    tmp += Math.pow(2, k);
                }
            }
            mexp = tmp;
            tmp = Math.pow(2, mexp - 1024) * nmant;
            if (sig == 1) tmp = -tmp;
            return tmp;
        } // doubleprec

        function litHex(buffer, pos, nb) {
            if ((pos + nb <= buffer.byteLength) && (pos >= 0) && (nb >= 0)) {
                var id = [];
                for (var i = pos; i < pos + nb; i++) {
                    var tmp = buffer.getUint8(i).toString(16);
                    if (tmp.length == 1) tmp = '0' + tmp;
                    id.push(tmp);
                }
                return id.join("");
            } else {
                console.log(JSON.stringify(info));
                console.log('Problème taille de buffer');
                fcb('le buffer est trop petit');
            }
        } // litHex


        function litCar(buffer, pos, nb) {
            if ((pos + nb <= buffer.byteLength) && (pos >= 0) && (nb >= 0)) {
                var id = [];
                for (var i = pos; i < pos + nb; i++) {
                    id.push(String.fromCharCode(buffer.getUint8(i)));
                }
                return decodeURIComponent(escape(id.join("")));
            } else {
                console.log(JSON.stringify(info));
                console.log('Problème taille de buffer');
                fcb('le buffer est trop petit');
            }
        } // litCar

        async function compvareval(ind, Boxes) {
            var offset = info.noVal[ind].offset;
            var type = info.noVal[ind].type;
            var nbB = info.noVal[ind].nbB;

            info.nbboucleslect++;
            var partie = info.file.slice(offset, offset + nbB);
            //console.log('Accès fichier avec offset='+offset);
            var tmpblob = new Response(partie);
            var buffer = await tmpblob.arrayBuffer(); // ça passe ???       
            var buffv = new DataView(buffer);

            if (nbB < info.lengthmax) {
                if (type == "s" || type == "8") {
                    var tmp = litCar(buffv, 0, nbB);
                    info.noVal[ind].value = tmp;
                }
                if (type == "b") {
                    info.noVal[ind].value = litHex(buffv, 0, nbB).toUpperCase();
                }
            } else {
                info.noVal[ind].value = "Too long, sorry !";
            }
            return false;
        } // compvareval

        function purgeboxesJUNKS(Boxes) {
            for (var i = info.JUNKS.length - 1; i > -1; i--) {
                var orgaJunks = info.JUNKS[i].split("-");
                var myBoxe = Boxes[0];
                for (var k = 1; k < orgaJunks.length - 1; k++) {
                    myBoxe = myBoxe.children[orgaJunks[k]];
                }
                var arrayBox = [];
                for (var u = 0; u < myBoxe.children.length; u++) {
                    if (u != orgaJunks[orgaJunks.length - 1]) arrayBox.push(myBoxe.children[u]);
                }
                myBoxe.children = [];
                for (var v = 0; v < arrayBox.length; v++) myBoxe.children.push(arrayBox[v]);
            }
            return Boxes;
        } // purgeboxesJUNKS

        function readAtoms(buffer) {
            var start = 0;
            for (var length = 1; length <= 8; length++) {
                if (buffer.getUint8(start) >= Math.pow(2, 8 - length)) {
                    break;
                }
            }
            if (length > nbB) { // theorical impossible
                fcb("Unrepresentable length: " + length + " 0x" + litHex(buffer, start, length) + " at offset : " + info.offset);
            }
            var value = buffer.getUint8(start) & (1 << (8 - length)) - 1;
            for (var i = 1; i < length; i++) {
                if (i === 7) {
                    if (value >= Math.pow(2, 53 - 8) && buffer.getUint8(start + 7) > 0) {
                        fcb(' Error 1')
                    }
                }
                value *= Math.pow(2, 8);
                value += buffer.getUint8(start + i);
            }
            var tagStr = litHex(buffer, 0, length);
            if (schema[tagStr] === undefined) {
                console.log(JSON.stringify(info));
                console.log('le tag ' + tagStr + ' absent de schema');
                fcb('le tag ' + tagStr + ' absent de schema');
            }
            var tagObj = {
                tag: value,
                tagStr: tagStr,
                type: schema[tagStr].type,
                name: schema[tagStr].name,
                start: info.offset,
                next: length // next position in the buffer
            };
                /*  debug ------------------------------------------- */
                //if (schema[tagStr].name == 'ContentCompression'){
                //    var trc=5;
                //}

            var start = length; // offset in buffer of dataSize
            for (var length = 1; length <= 8; length++) {
                if (buffer.getUint8(start) >= Math.pow(2, 8 - length)) {
                    break;
                }
            }
            if (length + tagObj.next > nbB) {
                fcb("Unrepresentable length: " + length + " 0x" + litHex(buffer, start, length) + " at offset : " + info.offset + start);
            } else {
                tagObj.next += length;
            }

            var value = buffer.getUint8(start) & (1 << (8 - length)) - 1;
            for (var i = 1; i < length; i++) {
                if (i === 7) {
                    if (value >= Math.pow(2, 53 - 8) && buffer.getUint8(start + 7) > 0) {
                        fcb(' Error 2')
                    }
                }
                value *= Math.pow(2, 8);
                value += buffer.getUint8(start + i);
            }
            tagObj.dataSize = value;
            // lecture contenu / readContent   types : "m" : Master, "u" : unsigned int, "i" : signed int, "s" : string, "8" : UTF-8 string, "b" : binary, "f" : float, "d" : date
            if (tagObj.type != "m") {
                if (start + value + tagObj.dataSize <= nbB) {
                    if (tagObj.type == "b") {
                        tagObj.value = litHex(buffer, tagObj.next, tagObj.dataSize).toUpperCase();
                    } else {
                        if (tagObj.type == "d") {
                            var nbnano = (buffer.getUint32(tagObj.next, false) * (1 << 16) * (1 << 16)) + buffer.getUint32(tagObj.next + 4, false);
                            tagObj.value = new Date(nbnano / 1000000 + 978307200000);
                        } else {
                            if (tagObj.type == "s" || tagObj.type == "8") {
                                tagObj.value = litCar(buffer, tagObj.next, tagObj.dataSize);
                            } else {
                                if (tagObj.type == "b") {
                                    tagObj.value = litHex(buffer, tagObj.next, tagObj.dataSize);
                                } else { // "u", "i" or "f"
                                    tagObj.value = 0;
                                    for (var u = 0; u < tagObj.dataSize; u++) {
                                        tagObj.value += Math.pow(2, 8 * (tagObj.dataSize - 1 - u)) * buffer.getUint8(tagObj.next + u);
                                    }
                                    if (tagObj.type == "f") {
                                        if (tagObj.dataSize == 4) {
                                            tagObj.value = singleprec(tagObj.value);
                                        } else {
                                            tagObj.value = doubleprec(tagObj.value);
                                        }
                                    } else { // 'i'
                                        if (tagObj.value > Math.pow(2, (8 * tagObj.dataSize) - 1)) {
                                            tagObj.value -= Math.pow(2, 8 * tagObj.dataSize);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                info.offset = info.offset + tagObj.next + tagObj.dataSize;
            } else { //tag.type = "m"
                tagObj.children = [];
                info.offset = info.offset + tagObj.next;
            }
            tagObj.nextoffset = tagObj.start + tagObj.next + tagObj.dataSize;

            var boxmother = Boxes[0];
            for (var k = 1; k < ascendance.length; k++) {
                boxmother = boxmother.children[ascendance[k]];
            }
            boxmother.children.push(tagObj);
            ascendance.push(boxmother.children.length - 1);
            // save in info.noVal values not obtained because buffer too small / On sauvegarde temporairement les valeurs non obtenues car buffer trop petit
            // Ne devrait plus pouvoir être le cas depuis v8 car Void ne fait plus partie de la liste des tags
            if ((tagObj.type != "m") && (typeof tagObj.value === 'undefined') && (tagObj.name != 'Void')) {
                var tmp = {};
                tmp.name = tagObj.name;
                tmp.type = tagObj.type;
                tmp.nbB = tagObj.dataSize;
                tmp.offset = tagObj.start + tagObj.next;
                tmp.ascendance = ascendance.join("-");
                info.noVal.push(tmp);
            }
            if (tagObj.name == 'Void') { // on place de côté l'ascendance des boites "VOID"
                info.JUNKS.push(ascendance.join("-"));
            }
            if ((tagObj.type != "m") || ((tagObj.type == 'm') && (tagObj.dataSize == 0))){
                // Which box is the next mother ?   / Quelle boite est la prochaine mère ? 
                ascendance.pop(); // ascendance points to boxmere
                while ((boxmother.nextoffset == info.offset) && (ascendance.length > 1)) { //
                    ascendance.pop();
                    boxmother = Boxes[0];
                    for (var k = 1; k < ascendance.length; k++) {
                        boxmother = boxmother.children[ascendance[k]];
                    }
                }
            } else {
                if ((tagObj.name == 'Cues') || (tagObj.name == 'Cluster') || (tagObj.name == "Tags") || (tagObj.name == "Chapters") || (tagObj.name == "SeekHead")) {
                //if ((tagObj.name == 'Cues') || (tagObj.name == "Tags") || (tagObj.name == "Chapters") || (tagObj.name == "SeekHead")) {
                    // we skip ! 
                    info.offset = tagObj.nextoffset;
                    boxmother.children.pop();
                    ascendance.pop();
                }
            }
        }

        /*  --------------------------------------------------------------------
        Initialisation : déclaration des globales à parse
        --------------------------------------------------------------------  */
        info.offset = 0;
        var nbBoucles = 0;
        var ascendance = [0];
        var Boxes = [];
        var mere = {};
        mere.start = 0;
        mere.nextoffset = info.filesize;
        mere.name = "OldMammy";
        mere.children = [];
        Boxes.push(mere);
        nbBoucles = 0;
        var nbB;

        /*  --------------------------------------------------------------------
        Boucle principale de lecture des "atomes" du fichier .mkv (ou .webm)
        Elle crée et enrichit les structures Boxes et ascendance
        --------------------------------------------------------------------  */

        //async function boucleP(){    
        while (info.offset < info.filesize) {
            var nbBtoRead = info.filesize - info.offset;
            var nbB = Math.min(20, nbBtoRead);
            var partie = info.file.slice(info.offset, info.offset + nbB);            
            info.nbboucleslect++;
            var tmpblob = new Response(partie);
            //console.log('Accès fichier avec offset='+info.offset);
            var buffer = await tmpblob.arrayBuffer(); // ça passe !!!         
            var buffv = new DataView(buffer);
            readAtoms(buffv);
            nbBoucles += 1;
        }

        //console.log(JSON.stringify(Boxes));                          //FOR DEBUGGING

        /*  -----------------------------------------------------------
        Traitement de nettoyage des info.noVal, de création des atoms[] 
            et de mise en clair dans info
        -----------------------------------------------------------  */
        var atoms = [];
        var nbBtoRead = info.filesize - info.offset;
        var nbB = Math.min(20, nbBtoRead);
        if (info.noVal.length > 0) {
            // Détermination des valeurs "hors cadres" dans la structure info.noVal
            // Peut-être directement enregistrées dans Boxes auparavant ?? à voir !
            info.ind = 0;
            while (info.ind < info.noVal.length) {
                await compvareval(info.ind, Boxes);
                info.ind += 1;
            }
            // Mise à jour dans Boxes des valeurs stockées dans info.noVal On peut, dès lors, se passer de info.noVal après coup !
            for (var k = 0; k < info.noVal.length; k++) {
                var boxe = Boxes[0];
                var ascendance = info.noVal[k].ascendance.split("-");
                for (var i = 1; i < ascendance.length; i++) {
                    boxe = boxe.children[ascendance[i]];
                }
                boxe.value = info.noVal[k].value;
            }
            //console.log(JSON.stringify(info.noVal));                   //FOR DEBUGGING
            //console.log(JSON.stringify(info.JUNKS));                   //FOR DEBUGGING

            Boxes = purgeboxesJUNKS(Boxes);
            info.JUNKS = [];
            info.noVal = [];

            // transfert (??) des Boxes vers atoms !   En fait, après coup, Atoms <= Boxes (intérêt ?)
            for (var v = 0; v < Boxes[0].children.length; v++) atoms.push(Boxes[0].children[v]);
            Boxes = null;

            // analysis of atoms and compvare info :
            info.isEBML = -1;
            info.isSegment = -1;
            info.isInfo = -1;
            info.isTracks = -1;
            info.typemovie = "matroska"; // default
            info.isDuration = -1;  // ira stocker l'indice du bon élément de type info possédant cette propriété ! ( v6 )

            // Stocke dans info.isEBML et info.isSegment les numéros (s'ils existent) des 2 branches correspondantes de la structure atoms
            // Si l'une ou l'autre de ces 2 branches n'existait pas, info.isEBML et/ou info.isSegment resterait à la valeur -1 
            for (var k = 0; k < atoms.length; k++) {
                if (atoms[k].name == "EBML") info.isEBML = k; // ascendance 0-0
                if (atoms[k].name == "Segment") info.isSegment = k; // ascendance 0-1    
            }
            // ... et donc l'une ou l'autre de ces deux boucles 'for' ne se réaliserait pas
            // précise - en fait - le nombre de pistes correspondantes à Info et Tracks de la même manière que EBML et Segment ont été
            // mis à jour dans info
            for (var k = 0; k < atoms[info.isSegment].children.length; k++) {
                if (atoms[info.isSegment].children[k].name == 'Info') {
                    info.isInfo = k;
                    // Il y-a-t-il duration ?
                    var tmpinfo = atoms[info.isSegment].children[k];
                    for (var nb=0; nb < tmpinfo.children.length; nb++){
                        if (tmpinfo.children[nb].name == 'Duration'){
                            info.isDuration = k; 
                            info.dureeS = parseInt(tmpinfo.children[nb].value) / 1000; // seconds  
                        }    
                    }
                }    
                if (atoms[info.isSegment].children[k].name == 'Tracks') info.isTracks = k;
            }
            // va rechercher, s'il existe, le DocType (normalement matroska ou webM) et met à jour l'information info.typemovie
            // initialisée à matroska (au cas ou on serait en face d'un .webM)
            for (var k = 0; k < atoms[info.isEBML].children.length; k++) {
                if (atoms[info.isEBML].children[k].name == 'DocType') info.typemovie = atoms[info.isEBML].children[k].value;
            }
            // ATTENTION : présuppose que isSegment > -1 ainsi que isInfo > -1 mais, si tel est le cas, atominfo pointe sur 
            // l'atom correspondant ! Du coup met à jour dans info les 4 caractèristiques principales SI ELLES EXISTENT
            var atominfo = atoms[info.isSegment].children[info.isInfo];
            for (var k = 0; k < atominfo.children.length; k++) {
                if (atominfo.children[k].name == 'WritingApp') info.Creator = atominfo.children[k].value;
                if (atominfo.children[k].name == 'MuxingApp') info.WritingLibrary = atominfo.children[k].value;
                //if (atominfo.children[k].name == 'Duration') info.dureeS = parseInt(atominfo.children[k].value) / 1000; // seconds
                if (atominfo.children[k].name == 'SegmentUID') info.UID = atominfo.children[k].value;
            }
            // de la même manière, SI isSegment et isTrack sont > -1 ...
            var atomtracks = atoms[info.isSegment].children[info.isTracks];
            // Considère que les "trackEntry" ne peuvent être que filles de Tracks (puisque info.isTracks = k)


            for (var k = 0; k < atomtracks.children.length; k++) {
                if (atomtracks.children[k].name == "TrackEntry") {
                    var atomtrack = atomtracks.children[k];
                    var obj = {};
                    obj.default = 'Yes';
                    obj.forced = 'No';
                    for (var u = 0; u < atomtrack.children.length; u++) { // default
                        if (atomtrack.children[u].name == 'TrackNumber') obj.Id = atomtrack.children[u].value;
                        if (atomtrack.children[u].name == 'Language') obj.langage = atomtrack.children[u].value;
                        if (atomtrack.children[u].name == 'DefaultDuration') obj.ConstantFramerate = (1000000000 / atomtrack.children[u].value);
                        if (atomtrack.children[u].name == 'TrackType') {
                            if (atomtrack.children[u].value == 1) obj.typeEnt = 'Video';
                            if (atomtrack.children[u].value == 2) obj.typeEnt = 'Audio';
                            if (atomtrack.children[u].value == 3) obj.typeEnt = 'MuxedTrack';
                            if (atomtrack.children[u].value == 16) obj.typeEnt = 'Logo';
                            if (atomtrack.children[u].value == 17) obj.typeEnt = 'Subtitles';
                            if (atomtrack.children[u].value == 18) obj.typeEnt = 'Button';
                            if (atomtrack.children[u].value == 32) obj.typeEnt = 'Control';
                        }
                        if (atomtrack.children[u].name == 'FlagDefault' && atomtrack.children[u].value == 0) obj.default = "No";
                        if (atomtrack.children[u].name == 'FlagForced' && atomtrack.children[u].value == 1) obj.forced = "Yes";
                        if (atomtrack.children[u].name == 'Name') obj.name = atomtrack.children[u].value;
                        if (atomtrack.children[u].name == 'CodecID') obj.CodeC = atomtrack.children[u].value;
                        if (atomtrack.children[u].name == 'Video') {
                            var atomvideo = atomtrack.children[u];
                            for (var j = 0; j < atomvideo.children.length; j++) {
                                if (atomvideo.children[j].name == 'PixelWidth') obj.width = atomvideo.children[j].value;
                                if (atomvideo.children[j].name == 'PixelHeight') obj.height = atomvideo.children[j].value;
                                if (atomvideo.children[j].name == 'DisplayWidth') obj.Swidth = atomvideo.children[j].value;
                                if (atomvideo.children[j].name == 'DisplayHeight') obj.Sheight = atomvideo.children[j].value;
                            }
                        }
                        if (atomtrack.children[u].name == 'Audio') {
                            var atomvideo = atomtrack.children[u];
                            for (var j = 0; j < atomvideo.children.length; j++) {
                                if (atomvideo.children[j].name == 'SamplingFrequency') obj.Freq = atomvideo.children[j].value;
                                if (atomvideo.children[j].name == 'Channels') obj.nbChannels = atomvideo.children[j].value;
                                if (atomvideo.children[j].name == 'BitDepth') obj.DepthBit = atomvideo.children[j].value;
                                if (atomvideo.children[j].name == 'DisplayHeight') obj.Sheight = atomvideo.children[j].value;
                            }
                        }
                    }
                    info.tracks.push(obj);     // on n'enregistre une piste (track) QUE si c'en est une (trackEntry)
                } // TrackEntry
            } //       boucle sur atomtracks.children.length
        }
        //console.log('nb lectures MKV = '+info.nbboucleslect);
        fcb(null, info); // A priori le traitement est terminé : on renvoit info !
    }; // fin de MKVebml.parse

    /*  -------------------------------------
        Appel principal à la fonction "parse"
        C'est ici aussi que l'on définit la 
        gestion des erreurs et le retour !
        -------------------------------------   */
    MKVebml.parse(function(err, tags) {
        fcb(err, tags);
    });

}; // var mkv = function(opts, fcb){}


if (typeof module !== 'undefined' && module.exports) {
    module.exports = mkv;
} else {
    if (typeof define === 'function' && define.amd) {
        define('mkv', [], function() {
            return mkv;
        });
    }
}
