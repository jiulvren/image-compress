/*
三个参数
file：文件(类型是图片格式)，
obj：图片压缩的参数（{quality(质量)：quality，width(宽度)：width，height(高度)：height}）默认质量0.2,默认宽高（295*413）
callback：回调函数，返回Blod的值
isios: ios手机可能有兼容问题，兼容处理，不传参默认不开启
photoCompress()
    */
function photoCompress(file, obj, callback, isios) {
    var ready = new FileReader();
    /*开始读取指定的Blob对象或File对象中的内容. 当读取操作完成时,readyState属性的值会成为DONE,如果设置了onloadend事件处理程序,则调用之.同时,result属性中将包含一个data: URL格式的字符串以表示所读取文件的内容.*/
    ready.readAsDataURL(file);
    ready.onload = function () {
        var result = this.result;
        var orienta = 0;
        if ( isios ) {
            var arrayBuffer = base64ToArrayBuffer(result);
            orienta = getOrientation(arrayBuffer);
        }
        canvasDataURL(result, obj, orienta, callback)
    }
}

function canvasDataURL(path, obj, orienta, callback) {
    var img = new Image();
    img.src = path;
    img.onload = function () {
        var that = this;
        // 默认按比例压缩
        var w = that.width,
            h = that.height,
            quality = 0.2; // 默认图片质量为0.2

        w = obj.width || 295;
        h = obj.height || 413;
        
        //生成canvas
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        // 创建属性节点
        var anw = document.createAttribute("width");
        var anh = document.createAttribute("height");
        if (orienta == 6) {
            anw.nodeValue = h;
            anh.nodeValue = w;
        } else {
            anw.nodeValue = w;
            anh.nodeValue = h;
        }
        canvas.setAttributeNode(anw);
        canvas.setAttributeNode(anh);
        if (orienta == 6) {
            ctx.transform(0, 1, -1, 0, h, 0);
        } else if (orienta == 3) {
            ctx.transform(-1, 0, 0, -1, w, h);
        }
        ctx.drawImage(that, 0, 0, w, h);
        // 图像质量
        if (obj.quality && obj.quality <= 1 && obj.quality > 0) {
            quality = obj.quality;
        }
        // quality值越小，所绘制出的图像越模糊
        var base64 = canvas.toDataURL('image/jpeg', quality);
        var blod = convertBase64UrlToBlob(base64)
        document.getElementById("compressimg").src = base64;
        // 回调函数返回Blob的值
        callback(blod);
    }
}

/**
 * 将以base64的图片url数据转换为Blob
 * 用url方式表示的base64图片数据
 */
function convertBase64UrlToBlob(urlData) {
    var arr = urlData.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {
        type: mime
    });
}
function getOrientation(file) {
    let view = new DataView(file);
    let offset = 0,
        len = view.byteLength,
        oValue = 0;

    // SOI marker
    if (view.getUint16(0, false) != 0xFFD8) {
        return oValue;
    }

    // APP1 marker
    while (offset < len) {
        if (view.getUint16(offset, false) == 0xFFE1) break;
        else offset += 2;
    } //reject('不是 JPEG 文件')

    if (offset >= len) {
        return oValue;
    } //reject('没找到 APP1 标识')

    // now offset point to APP1 marker 0xFFD8
    let APP1_offset = offset;

    // offset + 4 point offset to EXIF Header
    let EXIF_offset = APP1_offset + 4;

    // check if  have 'Exif' ascii string: 0x45786966
    if (view.getUint32(EXIF_offset, false) != 0x45786966) {
        return oValue;
    } //reject('无 EXIF')

    let TIFF_offset = EXIF_offset + 6;

    // 0x4d4d: big endian, 0x4949: little endian
    let little = view.getUint16(TIFF_offset, false) == 0x4949 ? true : false

    let IFD0_offset = TIFF_offset + view.getUint32(TIFF_offset + 4);

    let entries_count = view.getUint16(IFD0_offset, little);
    let entries_offset = IFD0_offset + 2;

    for (let i = 0; i < entries_count; i++) {
        let tag_offset = entries_offset + (i * 12);
        if (view.getUint16(tag_offset, little) == 0x0112) {
            let resolve_value = view.getUint16(tag_offset + 8, little);
            return resolve_value;
        }
    }
    return oValue;
    //reject('没有 orientation 信息')
}

function base64ToArrayBuffer(base64, contentType) {
    contentType = contentType || base64.match(/^data\:([^\;]+)\;base64,/mi)[1] || ''; // e.g. 'data:image/jpeg;base64,...' => 'image/jpeg'
    base64 = base64.replace(/^data\:([^\;]+)\;base64,/gmi, '');
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
        view[i] = binary.charCodeAt(i);
    }
    return buffer;
}