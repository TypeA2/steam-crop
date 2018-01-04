var current_image = null;
var current_fname = null;

$(document).ready(() => {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "https://i.imgur.com/Rixco34.png", true);
    xhr.responseType = "blob";
    xhr.onload = (e) => {
        current_fname = e.target.responseURL.replace(/\\/g,'/').replace(/.*\//, '').split('.')[0];
        let file_reader = new FileReader();
        file_reader.onload = image_loaded;
        file_reader.readAsArrayBuffer(e.target.response);
    };
    xhr.send();

    let previous_target = null;
    $(window).on({
        "dragenter": (e) => {
            e.preventDefault();
            previous_target = e.target;
            $("#file-drop-zone").show();
        },
        "dragleave": (e) => {
            if(previous_target === e.target){
                $("#file-drop-zone").hide();
            }
        },
        "dragover dragenter": (e) => {
            e.preventDefault();
            e.stopPropagation();
        },
        "drop": (e) => {
            let data = e.originalEvent.dataTransfer;
            if (data && data.files.length) {
                e.preventDefault();
                e.stopPropagation();

                read_file(data.files[0])
            }
            $("#file-drop-zone").hide();
        }
    });

    $("#input-file").on("change", function(e) {
        if (this.files.length) {
            read_file(this.files[0]);
        }
    });

    $("#download-btn").on("click", () => {
        let left  = $("#left-dl-canvas")[0],
            right = $("#right-dl-canvas")[0],
            left_ctx  = left.getContext("2d"),
            right_ctx = right.getContext("2d");

        const ratio = current_image.width / 614;

        const left_width  = 506 * ratio;
        const right_width = 100 * ratio;
        const right_sx    = 514 * ratio;

        left.setAttribute("width", left_width);
        left.setAttribute("height", current_image.height);
        right.setAttribute("width", right_width);
        right.setAttribute("height", current_image.height);

        left_ctx.drawImage(current_image, 0, 0, left_width, current_image.height, 0, 0, left_width, current_image.height);
        right_ctx.drawImage(current_image, right_sx, 0, right_width, current_image.height, 0, 0, right_width, current_image.height);

        const left_b64  = left.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
        const right_b64 = right.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");

        let zip = new JSZip();

        zip.file(current_fname + "_left.png", left_b64, {base64: true});
        zip.file(current_fname + "_right.png", right_b64, {base64: true});

        zip.generateAsync({type: "blob"}).then(function(data){
            saveAs(data, current_fname + "_" + Date.now().toString(16) + ".zip");
        })
    });
});

function apply_image_on_canvas(e) {
    current_image = e.target;

    const ratio = 614 / current_image.width;
    const canvas_height = current_image.height * ratio;

    const left_sWidth = Math.round(506 / ratio);

    const right_sx = Math.round(514 / ratio);
    const right_sWidth = Math.round(100 / ratio);

    let left  = $("#left-canvas")[0],
        right = $("#right-canvas")[0],
        left_ctx  = left.getContext("2d"),
        right_ctx = right.getContext("2d");
    
    left.setAttribute("height", canvas_height);
    right.setAttribute("height", canvas_height);

    left_ctx.mozImageSmoothingEnabled = true;
    left_ctx.webkitImageSmoothingEnabled = true;
    left_ctx.msImageSmoothingEnabled = true;
    left_ctx.imageSmoothingEnabled = true;
    
    right_ctx.mozImageSmoothingEnabled = true;
    right_ctx.webkitImageSmoothingEnabled = true;
    right_ctx.msImageSmoothingEnabled = true;
    right_ctx.imageSmoothingEnabled = true;

    left_ctx.imageSmoothingQuality = "high";
    right_ctx.imageSMoothingQuality = "high";

    left_ctx.drawImage(current_image, 0, 0, left_sWidth, current_image.height, 0, 0, 506, canvas_height);
    right_ctx.drawImage(current_image, right_sx, 0, right_sWidth, current_image.height, 0, 0, 100, canvas_height);
}

function image_loaded(e) {
    let img = new Image();
    img.onload = apply_image_on_canvas;
    img.src = (typeof e.target.result === "object") ? "data:image/png;base64," + array_buffer_to_b64(e.target.result) : e.target.result;
}

function read_file(file) {
    current_fname = file.name.split('.')[0];

    let file_reader = new FileReader();
    file_reader.onload = image_loaded;
    file_reader.readAsDataURL(file);
}

function array_buffer_to_b64(buf) {
    let bin = "";
    let bytes = new Uint8Array(buf);
    const len = bytes.length;

    for(let i = 0; i < len; i++){
        bin += String.fromCharCode(bytes[i]);
    }

    return btoa(bin);
}