"use strict";

/** Cropper */
class Cropper {
    /**
     * Initializes the cropper
     * @param {string} fs - Selector for the direct file input
     * @param {string} ui - Selector for the remote url input
     * @param {string} dl - Selector for the download button
     * @param {Array.<string>} md[] - Selectors for switching modes
     * @param {string} pv - Selector for the preview container
     * @param {string} fd - Selector for the file drop zone
     */
    constructor(fs, ui, dl, md, pv, fd) {
        console.info("Initialising cropper with parameters:", fs, ui, dl, md, pv, fd);

        this.image  = null;
        this.fname  = null;
        this.previous_target = null;

        this.canvases = [];

        this.mode       = Cropper.modes.ARTWORK;

        this.file_select    = $(fs);
        this.url_input      = $(ui);
        this.download_btn   = $(dl);
        this.preview        = $(pv);
        this.mode_btns      = md;
        this.drop_zone      = $(fd);
        
        this.mode_btns.forEach((e) => {
            $(e).on("click", (e) => {
                $(e.currentTarget.parentElement).find(".active").removeClass("active");

                e.currentTarget.classList.add("active");

                this.mode = Cropper.modes[e.currentTarget.dataset.targetMode];
                this.mode_switched();
            })
        });

        this.url_input.on("change", (e) => {
            if (/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/.test(e.currentTarget.value)) {
                this.load_from_url();
            }
        });

        this.url_input.on("keypress", (e) => {
            if (e.keyCode === 13) {
                this.url_input.trigger("change");
            }
        });

       this.file_select.on("change", (e) => {
            if (e.currentTarget.files.length) {
                this.read_file(e.currentTarget.files[0]);
            }
        });

        this.download_btn.on("click", (e) => {
            this.download_zip();
        })

        $(window).on({
            "dragenter": (e) => {
                e.preventDefault();
                
                this.previous_target = e.target;

                this.drop_zone.show();
            },
            "dragleave": (e) => {
                if (this.previous_target === e.target) {
                   this.drop_zone.hide();
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

                    console.info("Loading local file", data.files[0]);
                    
                    this.read_file(data.files[0]);
                }

                this.drop_zone.hide();
            }
        })

        this.mode_switched();

        this.load_from_url();
    }

    /**
     * Changes the display mode for the preview to the currently selected mode
     */
    mode_switched() {
        this.download_btn.prop("disabled", 1);

        this.canvases.forEach((e) => {
            $(e).remove();
        });

        this.canvases = [];

        if (this.mode === Cropper.modes.ARTWORK) {
            console.info("Switching mode to ARTWORK");

            this.preview.removeClass("mode-workshop2 mode-workshop4").addClass("mode-artwork");

            let left = document.createElement("canvas");
            let right = document.createElement("canvas");

            left.className = "left-canvas";
            left.width = 506;
            left.height = 500;

            right.className = "right-canvas";
            right.width = 100;
            right.height = 500;

            this.preview.append(left, right);

            this.canvases = [left, right];
        } else if (this.mode === Cropper.modes.WORKSHOP2) {
            console.info("Switching mode to WORKSHOP2");

            this.preview.removeClass("mode-artwork mode-workshop4").addClass("mode-workshop2");

            let left = document.createElement("canvas");
            let right = document.createElement("canvas");

            left.className = "left-canvas";
            left.width = 150;
            left.height = 150;

            right.className = "right-canvas";
            right.width = 150;
            right.height = 150;

            this.preview.append(left, right);

            this.canvases = [left, right];
        } else if (this.mode === Cropper.modes.WORKSHOP4) {
            console.log("Switching mode to WORKSHOP4");

            this.preview.removeClass("mode-workshop2 mode-artwork").addClass("mode-workshop4");

            let c0 = document.createElement("canvas");
            let c1 = document.createElement("canvas");
            let c2 = document.createElement("canvas");
            let c3 = document.createElement("canvas");

            c0.className = "c0";
            c0.width = 150;
            c0.height = 150;
            
            c1.className = "c1";
            c1.width = 150;
            c1.height = 150;
            
            c2.className = "c2";
            c2.width = 150;
            c2.height = 150;
            
            c3.className = "c3";
            c3.width = 150;
            c3.height = 150;

            this.preview.append(c0, c1, c2, c3);

            this.canvases = [c0, c1, c2, c3];
        }

        if (this.image) {
            this.display_image(this.image);
        }
    }

    /**
     * Displays the image loaded by the Event e in the appropiate mode
     * @param {HTMLElement} img - Image element to display
     */
    display_image(img) {
        this.image = img;

        if (this.mode === Cropper.modes.ARTWORK) {
            console.info("Calculating dimensions for Cropper.modes.ARTWORK");

            // Multiplying all dimension by this ratio gives the display size (506 (left) + 100 (right) + 2 (2 * border) + 6 (margin))
            const ratio = 614 / this.image.width;
            const canvas_height = this.image.height * ratio;

            this.canvases[0].height = canvas_height;
            this.canvases[1].height = canvas_height;

            // Number of pixels of the source image to be scaled down to fit on the canvases
            const projected_width_left = Math.round(506 / ratio);
            const projected_width_right = Math.round(100 / ratio);

            // Offset from (0, 0) on the soruce image that the right canvas will start on
            const projected_start_right = Math.round(514 / ratio);

            console.info(`Projection: ${projected_width_left}x${this.image.height} @ (0, 0), ${projected_width_right}x${this.image.height} @ (${projected_start_right}, 0)`);
            console.info(`Drawn: 506x${Math.round(canvas_height)}, 100x${Math.round(canvas_height)} (ratio: ${ratio})`);

            let c0 = this.canvases[0].getContext("2d");
            let c1 = this.canvases[1].getContext("2d");

            c0.mozImageSmoothingEnabled = true;
            c0.webkitImageSmoothingEnabled = true;
            c0.msImageSmoothingEnabled = true;
            c0.imageSmoothingEnabled = true;
            c0.imageSmoothingQuality = "high"

            c1.mozImageSmoothingEnabled = true;
            c1.webkitImageSmoothingEnabled = true;
            c1.msImageSmoothingEnabled = true;
            c1.imageSmoothingEnabled = true;
            c1.imageSmoothingQuality = "high"

            c0.drawImage(this.image, 0, 0, projected_width_left, this.image.height, 0, 0, 506, canvas_height);
            c1.drawImage(this.image, projected_start_right, 0, projected_width_right, this.image.height, 0, 0, 100, canvas_height);
        } else if (this.mode === Cropper.modes.WORKSHOP2) {
            console.info("Calculating dimensions for Cropper.modes.WORKSHOP2");

            // height * aspect_ratio = width
            const aspect_ratio = 304 / 150;

            // If clamp_width is true, then the display can use the source image's full width, else the maximum width is image.height * aspect_ratio
            // If clamp_width is true, then the usable height is equal to image.width / aspect_ratio, else it's the full height
            const clamp_width = this.image.width / aspect_ratio <= this.image.height;

            console.info("Clamping dimensions to", clamp_width ? "width" : "height");

            const projected_width_total = clamp_width ? this.image.width : (this.image.height * aspect_ratio);
            const projected_height = clamp_width ? (this.image.width / aspect_ratio) : this.image.height;

            console.info(`Captured area: ${Math.round(projected_width_total)}x${Math.round(projected_height)}`);
            
            let c0 = this.canvases[0].getContext("2d");
            let c1 = this.canvases[1].getContext("2d");

            c0.mozImageSmoothingEnabled = true;
            c0.webkitImageSmoothingEnabled = true;
            c0.msImageSmoothingEnabled = true;
            c0.imageSmoothingEnabled = true;
            c0.imageSmoothingQuality = "high"

            c1.mozImageSmoothingEnabled = true;
            c1.webkitImageSmoothingEnabled = true;
            c1.msImageSmoothingEnabled = true;
            c1.imageSmoothingEnabled = true;
            c1.imageSmoothingQuality = "high";

            c0.drawImage(this.image, 0, 0, projected_height, projected_height, 0, 0, 150, 150);
            c1.drawImage(this.image, projected_width_total - projected_height, 0, projected_height, projected_height, 0, 0, 150, 150);
        } else if (this.mode === Cropper.modes.WORKSHOP4) {
            console.info("Calculating dimensions for Cropper.modes.WORKSHOP4");

            // See WORKSHOP2
            const aspect_ratio = 612 / 150;

            // See WORKSHOP2
            const clamp_width = this.image.width / aspect_ratio <= this.image.height;

            console.info("Clamping dimensions to", clamp_width ? "width" : "height");

            const projected_width_total = clamp_width ? this.image.width : (this.image.height * aspect_ratio);
            const projected_height = clamp_width ? (this.image.width / aspect_ratio) : this.image.height;

            console.info(`Captured area: ${Math.round(projected_width_total)}x${Math.round(projected_height)}`);

            const projected_separation = (projected_width_total - (4 * projected_height)) / 3;

            console.info(`Projected separation: ${projected_separation}`);

            for (let i = 0; i < 4; i++) {
                let ctx = this.canvases[i].getContext("2d");

                ctx.mozImageSmoothingEnabled = true;
                ctx.webkitImageSmoothingEnabled = true;
                ctx.msImageSmoothingEnabled = true;
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high"

                ctx.drawImage(this.image, i * projected_height + i * projected_separation, 0, projected_height, projected_height, 0, 0, 150, 150);
            }
        }

        this.download_btn.removeAttr("disabled");
    }

    /**
     * Promts the downloading of a zip file containing the cropped files as well as scaled variants
     */
    download_zip() {
        this.download_btn.prop("disabled", 1);
        if (this.mode === Cropper.modes.ARTWORK) {
            console.info("Preparing .zip for Cropper.modes.ARTWORK, basename:", this.fname);

            // Ratio with which the original width (614px) needs to scale
            // Height is always fully used
            const ratio = this.image.width / 614;
            
            const projected_width_left = ratio * 506;
            const projected_width_right = ratio * 100;
            const projected_start_right = ratio * 514;

            console.info(`Projection: ${projected_width_left}x${this.image.height} @ (0, 0), ${projected_width_right}x${this.image.height} @ (${projected_start_right}, 0)`);

            let c0 = document.createElement("canvas");
            let c1 = document.createElement("canvas");

            c0.width = projected_width_left;
            c0.height = this.image.height;

            c1.width = projected_width_right;
            c1.height = this.image.height;

            let ctx0 = c0.getContext("2d");
            let ctx1 = c1.getContext("2d");

            ctx0.drawImage(this.image, 0, 0, projected_width_left, this.image.height, 0, 0, projected_width_left, this.image.height);
            ctx1.drawImage(this.image, projected_start_right, 0 , projected_width_right, this.image.height, 0, 0, projected_width_right, this.image.height);

            const base64_original0 = c0.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
            const base64_original1 = c1.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
            const base64_scaled0 = this.canvases[0].toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
            const base64_scaled1 = this.canvases[1].toDataURL("image/png").replace(/^data:image\/png;base64,/, "");

            let zip = new JSZip();

            zip.file(this.fname + "_left_original.png", base64_original0, { base64: true });
            zip.file(this.fname + "_right_original.png", base64_original1, { base64: true });
            zip.file(this.fname + "_left_scaled.png", base64_scaled0, { base64: true });
            zip.file(this.fname + "_right_scaled.png", base64_scaled1, { base64: true});

            zip.generateAsync({ type: "blob" }).then((blob) => {
                console.info("Created", blob.type, "blob containing", blob.size, "bytes")
                saveAs(blob, this.fname + "_ARTWORK_" + Date.now().toString(16) + ".zip");

                this.download_btn.removeAttr("disabled");
            });
        } else if (this.mode === Cropper.modes.WORKSHOP2) {
            console.info("Preparing .zip for Cropper.modes.WORKSHOP2, basename:", this.fname);

            // Target aspect ratio
            const aspect_ratio = 304 / 150;

            // Whether we need to clamp to width or height
            const clamp_width = this.image.width / aspect_ratio <= this.image.height;

            console.info("Clamping dimensions to", clamp_width ? "width" : "height");

            const projected_width_total = clamp_width ? this.image.width : (this.image.height * aspect_ratio);
            const projected_height = clamp_width ? (this.image.width / aspect_ratio) : this.image.height;

            console.info(`Projection: ${Math.round(projected_height)}x${Math.round(projected_height)} @ (0, 0) & (${Math.round(projected_width_total - projected_height)}, 0)`);

            let c0 = document.createElement("canvas");
            let c1 = document.createElement("canvas");

            c0.width = projected_height;
            c0.height = projected_height;

            c1.width = projected_height;
            c1.height = projected_height;

            let ctx0 = c0.getContext("2d");
            let ctx1 = c1.getContext("2d");

            ctx0.drawImage(this.image, 0, 0, projected_height, projected_height, 0, 0, projected_height, projected_height);
            ctx1.drawImage(this.image, projected_width_total - projected_height, 0, projected_height, projected_height, 0, 0, projected_height, projected_height);

            const base64_original0 = c0.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
            const base64_original1 = c1.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
            const base64_scaled0 = this.canvases[0].toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
            const base64_scaled1 = this.canvases[1].toDataURL("image/png").replace(/^data:image\/png;base64,/, "");

            let zip = new JSZip();

            zip.file(this.fname + "_0_original.png", base64_original0, { base64: true });
            zip.file(this.fname + "_1_original.png", base64_original1, { base64: true });
            zip.file(this.fname + "_0_scaled.png", base64_scaled0, { base64: true });
            zip.file(this.fname + "_1_scaled.png", base64_scaled1, { base64: true });

            zip.generateAsync({ type: "blob" }).then((blob) => {
                console.info("Created", blob.type, "blob containing", blob.size, "bytes")
                saveAs(blob, this.fname + "_WORKSHOP2_" + Date.now().toString(16) + ".zip");

                this.download_btn.removeAttr("disabled");
            });
        } else if (this.mode === Cropper.modes.WORKSHOP4) {
            console.info("Preparing .zip for Cropper.modes.WORKSHOP4, basename:", this.fname);

            // See WORKSHOP2
            const aspect_ratio = 612 / 150

            // See WORKSHOP2
            const clamp_width = this.image.width / aspect_ratio <= this.image.height;

            console.info("Clamping dimensions to", clamp_width ? "width" : "height");

            const projected_width_total = clamp_width ? this.image.width : (this.image.height * aspect_ratio);
            const projected_height = clamp_width ? (this.image.width / aspect_ratio) : this.image.height;
            const projected_separation = (projected_width_total - (4 * projected_height)) / 3;

            console.info(`Projection: ${Math.round(projected_height)}x${Math.round(projected_height)} @ (0, 0) & (${Math.round(projected_height + projected_separation)}, 0) & (${Math.round(projected_height * 2 + projected_separation * 2)}, 0) & (${Math.round(projected_height * 3 + projected_separation * 3)}, 0)`);
        
            let zip = new JSZip();

            for (let i = 0; i < 4; i++) {
                let canvas = document.createElement("canvas");
                
                canvas.width = projected_height;
                canvas.height = projected_height;

                let ctx = canvas.getContext("2d");

                ctx.drawImage(this.image, i * projected_height + i * projected_separation, 0, projected_height, projected_height, 0, 0, projected_height, projected_height);

                const base64_original = canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
                const base64_scaled = this.canvases[i].toDataURL("image/png").replace(/^data:image\/png;base64,/, "");

                zip.file(this.fname + `_${i}_original.png`, base64_original, { base64: true });
                zip.file(this.fname + `_${i}_scaled.png`, base64_scaled, { base64: true });
            }

            zip.generateAsync({ type: "blob" }).then((blob) => {
                console.info("Created", blob.type, "blob containing", blob.size, "bytes")
                saveAs(blob, this.fname + "_WORKSHOP4_" + Date.now().toString(16) + ".zip");

                this.download_btn.removeAttr("disabled");
            });
        }
    }

    /**
     * Loads an image from the supplied ProgressEvent
     * @param {ProgressEvent} e - Event used by the onload callback
     * @param {Cropper} parent  - Parent Cropper instance
     */
    load_image(e, parent) {
        console.info(`Loaded ${e.loaded} bytes`);

        let img = new Image();
        img.onload = (e) => { parent.display_image(e.target); };
        img.src = (typeof e.target.result === "object") ?
            "data:image/png;base64," + Cropper.array_buffer_to_b64(e.target.result) : e.target.result;
    }

    /**
     * Load an image from the remote url in this.url_input
     */
    load_from_url() {
        this.download_btn.prop("disabled", 1);

        const url = this.url_input.val();

        let xhr = new XMLHttpRequest();

        console.info("Loading remote image from", url)

        xhr.open("GET", url, true);
        xhr.responseType = "blob";

        xhr.onload = (e) => {
            this.fname = e.target.responseURL.replace(/\\/g,'/').replace(/.*\//, '').split('.')[0];

            let file_reader = new FileReader();
            file_reader.onload = (e) => { this.load_image(e, this); };
            file_reader.readAsArrayBuffer(e.target.response);
        };

        xhr.send();
    }

    /**
     * Loads an image from a local file
     * @param {File} file - The local file to load
     */
    read_file(file) {
        this.download_btn.prop("disabled", 1)

        this.fname = file.name.split('.')[0];
    
        let file_reader = new FileReader();
        file_reader.onload = (e) => { this.load_image(e, this); };
        file_reader.readAsDataURL(file);
    }

    /**
     * Converts an ArrayBuffer to base64
     * @param {ArrayBuffer} buf - ArrayBuffer to convert to b64
     * @return {string} Base64 representation of the ArrayBuffer 
     */
    static array_buffer_to_b64(buf) {
        let bin = "";
        let bytes = new Uint8Array(buf);
        const len = bytes.length;
    
        for(let i = 0; i < len; i++){
            bin += String.fromCharCode(bytes[i]);
        }
    
        return btoa(bin);
    }

    /**
     * Returns the available modes in a frozen object
     * @return {Object} - The available modes
     */
    static get modes() {
        return Object.freeze({
            ARTWORK: 0,
            WORKSHOP2: 1,
            WORKSHOP4: 2
        });
    }
}

$(document).ready(() => {
    void new Cropper("#input-file", "#url-input", "#download-btn",
                        ["#mode-artwork", "#mode-workshop-2", "#mode-workshop-4"],
                        "#preview-container", "#file-drop-zone");
});
