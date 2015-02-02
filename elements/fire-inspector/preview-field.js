Polymer(EditorUI.mixin({
    publish: {
        'width': 200,
        'height': 200,
        'min-width': 10,
        'min-height': 10,

        asset: null,
        meta: null,
        hide: { value: false, reflect: true },
    },

    created: function () {
        this.info = "Unkown";
        this.audioNowPlayTime = 0;
    },

    ready: function () {
        this._initResizable();
    },

    resize: function () {
        if ( !this.asset)
            return;

        var contentRect = this.$.content.getBoundingClientRect();

        if ( this.asset instanceof Fire.Texture ||
             this.asset instanceof Fire.Sprite ) {
            if ( this.asset.width > contentRect.width &&
                 this.asset.height > contentRect.height )
            {
                var width = contentRect.width;
                var height = this.asset.height * contentRect.width/this.asset.width;

                if ( height > contentRect.height ) {
                    height = contentRect.height;
                    width = this.asset.width * contentRect.height/this.asset.height;
                }

                this.$.canvas.width = width;
                this.$.canvas.height = height;
            }
            else if ( this.asset.width > contentRect.width ) {
                this.$.canvas.width = contentRect.width;
                this.$.canvas.height = this.asset.height * contentRect.width/this.asset.width;
            }
            else if ( this.asset.height > contentRect.height ) {
                this.$.canvas.width = this.asset.width * contentRect.height/this.asset.height;
                this.$.canvas.height = contentRect.height;
            }
            else {
                this.$.canvas.width = this.asset.width;
                this.$.canvas.height = this.asset.height;
            }
        }
        else {
            this.$.canvas.width = contentRect.width;
            this.$.canvas.height = contentRect.height;
        }

        //
        this.repaint();
    },

    repaint: function () {
        var ctx = this.$.canvas.getContext("2d");

        if ( this.asset instanceof Fire.Texture ) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage( this.asset.image, 0, 0, this.$.canvas.width, this.$.canvas.height );

            var xRatio = this.$.canvas.width / this.asset.width;
            var yRatio = this.$.canvas.height / this.asset.height;

            if ( this.meta.subAssets ) {
                if ( this.meta.type === Fire.TextureType.Sprite ) {
                    for ( var subInfo of this.meta.subAssets ) {
                        if ( subInfo.asset instanceof Fire.Sprite ) {
                            ctx.beginPath();
                            ctx.rect( subInfo.asset.x * xRatio,
                                      subInfo.asset.y * yRatio,
                                      subInfo.asset.width * xRatio,
                                      subInfo.asset.height * yRatio );
                            ctx.lineWidth = 1;
                            ctx.strokeStyle = '#ff00ff';
                            ctx.stroke();
                        }
                    }
                }
            }
        }
        else if ( this.asset instanceof Fire.Sprite ) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage( this.asset.texture.image,
                           this.asset.x, this.asset.y, this.asset.width, this.asset.height,
                           0, 0, this.$.canvas.width, this.$.canvas.height
                         );
        }
        else if ( this.asset instanceof Fire.AudioClip ) {
            // TODO
            if (this.audioSource) {
                this.allAudioStop();
            }

            this.audioSource = new Fire.AudioSource();
            this.audioSource.clip = this.asset;

            var devicePixelRation = window.devicePixelRatio;

            this.width = this.$.canvas.getBoundingClientRect().width;
            this.height = this.$.canvas.getBoundingClientRect().height;

            this.buffer = this.asset.rawData;
            this.audioLength = this.buffer.duration;
            this.peaks = this.getPeaks(this.width);
            this.drawWave(ctx,this.peaks,1,devicePixelRation);
        }
    },

    playAudioAction: function (event) {

        // NOTE: 这里代码要改
        if(event.target.className === "fa fa-play") {
            event.target.className = "fa fa-pause";
        }
        else if (event.target.className = "fa fa-pause"){
            event.target.className = "fa fa-play";
        }
        if (this.audioSource.isPlaying) {
            this.audioSource.pause();
            this.allAudioStop();
        }
        else {
            this.audioSource.play();
            this.updateProgress();
        }

    },

    // NOTE: 临时代码
    updateProgress: function () {
        this.audioSource.onEnd = function () {
            this.allAudioStop();
        }.bind(this);
        this.audioNowPlayTime = 0;
        this.timeSpan = setInterval(function () {
            this.audioNowPlayTime ++;
        }.bind(this),1000);
    },

    // NOTE: 临时代码
    allAudioStop: function () {
        this.audioSource.stop();
        this.audioNowPlayTime = 0;
        clearInterval(this.timeSpan);
        this.audioSource = null;
    },

    drawWave: function (ctx,peaks, max,devicePixelRation) {
        //devicePixelRatio  win:1  mac: 2
        var $ = 0.5 / devicePixelRation ;
        var halfH = this.height / 2;
        var coef = halfH / max;
        var length = peaks.length;
        var scale = 1;
        ctx.fillStyle = "yellow";
        if (this.width !== length) {
            scale = this.width / length;
        }
        [ctx].forEach(function (cc) {
            if (!cc) { return; }
            cc.beginPath();
            cc.moveTo($, halfH);
            for (var i = 0; i < length; i++) {
                var h = Math.round(peaks[i] * coef);
                cc.lineTo(i * scale + $, halfH + h);
            }
            cc.lineTo(this.width + $, halfH);
            cc.moveTo($, halfH);
            for (var i = 0; i < length; i++) {
                var h = Math.round(peaks[i] * coef);
                cc.lineTo(i * scale + $, halfH - h);
            }
            cc.lineTo(this.width + $, halfH);
            cc.fill();
            cc.fillRect(0, halfH - $, this.width, $);
        }.bind(this));
    },

    //这个是根据原peaks 转换成根据canvas宽度同等的小数据，避免绘制冗余
    getPeaks: function (length) {
        var buffer = this.buffer;
        var sampleSize = buffer.length / length;
        var sampleStep = ~~(sampleSize / 10) || 1;
        var channels = buffer.numberOfChannels;
        var peaks = new Float32Array(length);
        for (var c = 0; c < channels; c++) {
            var chan = buffer.getChannelData(c);
            for (var i = 0; i < length; i++) {
                var start = ~~(i * sampleSize);
                var end = ~~(start + sampleSize);
                var max = 0;
                for (var j = start; j < end; j += sampleStep) {
                    var value = chan[j];
                    if (value > max) {
                        max = value;
                    // faster than Math.abs
                    } else if (-value > max) {
                        max = -value;
                    }
                }
                if (c == 0 || max > peaks[i]) {
                    peaks[i] = max;
                }
            }
        }

        return peaks;
    },

    assetChanged: function () {
        if ( !this.hide )
            this.resize();

        if ( this.asset instanceof Fire.Texture ||
             this.asset instanceof Fire.Sprite ) {
            this.info = this.asset.width + " x " + this.asset.height;
        }
    },

    resizeAction: function ( event ) {
        this.resize();
    },
}, EditorUI.resizable));
