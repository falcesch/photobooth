var L10N = {};
var photoBooth = (function () {
    config = {};
    // vars
    var public = {},
        loader = $('#loader'),
        startPage = $('#start'),
        countDown = cntdwn_time,       // Countdown from config
        cheeseTime = cheese_time,
        timeToLive = 90000,
        qr = false,
        timeOut,
        saving = false,
        gallery = $('#gallery'),
        showScrollbarsInGallery = gallery_scrollbar,
        processing = false,
        pswp = {},
        resultPage = $('#result'),
        imgFilter = 'imgPlain',
        stream,
        webcamConstraints = {
            audio: false,
            video: {
                width: 720,
                height: 480,
                facingMode: "user",
            }
        };

    // timeOut function
    public.resetTimeOut = function () {
        timeOut = setTimeout(function () {
            window.location = window.location.origin;
        }, timeToLive);
    }

    // reset whole thing
    public.reset = function () {
        loader.hide();
        qr = false;
        $('.qr').html('').hide();
        $('.qrbtn').removeClass('active').attr('style', '');
        $('.loading').text('');
        gallery.removeClass('open');
        $('.galInner').hide();
        $('.resultInner').css({
            'bottom': '-100px'
        });
        $('.spinner').hide();
        $('.send-mail').hide();
        public.resetMailForm();
    }

    // init
    public.init = function (options) {
        public.l10n();
        public.reset();
        var w = window.innerWidth;
        var h = window.innerHeight;
        $('#wrapper').width(w).height(h);
        $('.galleryInner').width(w * 3);
        $('.galleryInner').height(h);
        $('.galleryInner div').width(w);
        $('.galleryInner').css({
            'left': -w
        });
        loader.width(w).height(h);
        $('.stages').hide();
        public.initPhotoSwipeFromDOM('#galimages');

        startPage.show();
    }

    // check for resizing
    public.handleResize = function () {
        var w = window.innerWidth;
        var h = window.innerHeight;
        $('#wrapper').width(w).height(h);
        $('#loader').width(w).height(h);
    }

    public.l10n = function (elem) {
        elem = $(elem || 'body');
        elem.find('[data-l10n]').each(function (i, item) {
            item = $(item);
            item.html(L10N[item.data('l10n')]);
        });
    }

    // Set the width of the side navigation to 250px and the left margin of the page content to 250px
    public.openNav = function () {
	document.getElementById("mySidenav").style.width = "250px";
    }

    // Set the width of the side navigation to 0 and the left margin of the page content to 0 */
    public.closeNav = function () {
	document.getElementById("mySidenav").style.width = "0";
    }

    // Cheese
    public.cheese = function (photoStyle) {
        if (isdev) {
            console.log(photoStyle);
        }
        if ((photoStyle=='photo')){
            $('#counter').text('');
            $('.loading').text(L10N.cheese);
        } else {
            $('#counter').text('');
            $('.loading').text(L10N.cheeseCollage);
        }
        public.takePic(photoStyle);
    }

    // take Picture
    public.takePic = function (photoStyle) {
        processing = true;
        if (isdev) {
            console.log('Take Picture:' + photoStyle);
        }
        setTimeout(function () {
            if(useVideo){
                var track = public.stream.getTracks()[0];
                track.stop();
                $('video').hide();
            }
	    if ((photoStyle=='photo')){
                $('#counter').text('');
                $('.spinner').show();
                $('.loading').text(L10N.busy);
            } else {
                $('#counter').text('');
                if (!isdev) {
                    setTimeout(function () {
                        $('.spinner').show();
                        $('.loading').text(L10N.busyCollage);
                }, 7500);
                } else {
                    $('.spinner').show();
                    $('.loading').text(L10N.busyCollage);
                }
	    }
            $('#counter').text('');
        }, cheeseTime);
        jQuery.post("takePic.php",{filter: imgFilter,style: photoStyle}).done(function( result ){
            result = JSON.parse(result);
            if (result.error) {
                public.errorPic(result);
            } else {
                public.renderPic(result);
            }

        }).fail(function(xhr, status, result){
            public.errorPic(result);
        });
    }

    // Show error Msg and reset
    public.errorPic = function (result) {
        setTimeout(function () {
            $('.spinner').hide();
            $('.loading').html(L10N.error + '<a class="btn" href="/">' + L10N.reload + '</a>');
        }, 1100);
    }

    // Render Picture after taking
    public.renderPic = function (result) {
        // Add QR Code Image
        $('.qr').html('');
        $('<img src="qrcode.php?filename=' + result.img + '"/>').on('load', function () {
            $(this).appendTo($('.qr'));
            $('<p>').html(L10N.qrHelp).appendTo($('.qr'));
        });

        // Add Print Link
        $(document).off('click touchstart', '.printbtn');
        $(document).on('click', '.printbtn', function (e) {
            e.preventDefault();
            document.getElementById("print_mesg").style.display = "block";
            setTimeout(function () {
                $.ajax({
                    url: 'print.php?filename=' + encodeURI(result.img),
                }).done(function (data) {
                    if (isdev) {
                        console.log(data)
                    }
                    setTimeout(function () {
                        document.getElementById("print_mesg").style.display = "none";
                        window.location = window.location.origin;
                    },5000);
                })
            },1000);
        });

        // Add Image to gallery and slider
        public.addImage(result.img);

        // Add Image
        $('<img src="/'+imgFolder+'/' + result.img + '" class="original">').on('load', function () {
            $('#result').css({
                'background-image': 'url(/'+imgFolder+'/' + result.img + ')'
            });
            startPage.fadeOut(400, function () {
                resultPage.fadeIn(400, function () {
                    setTimeout(function () {
                        processing = false;
                        loader.slideUp('fast');
                    }, 400);
                    setTimeout(function () {
                        $('.resultInner').stop().animate({
                            'bottom': '50px'
                        }, 400).removeClass('hidden');
                    }, 400);
                    clearTimeout(timeOut);
                    public.resetTimeOut();
                });
            });
        });
    }

    // add image to Gallery
    public.addImage = function (imageName) {
        var thumbImg = new Image();
        var bigImg = new Image();
        var thumbSize = '';
        var bigSize = '';

        var imgtoLoad = 2;

        thumbImg.onload = function() {
            thumbSize = this.width + 'x' + this.height;
            if (--imgtoLoad == 0) {allLoaded();}
        }

        bigImg.onload = function() {
            bigSize = this.width + 'x' + this.height;
            if (--imgtoLoad == 0) {allLoaded();}
        }

        bigImg.src = '/'+imgFolder+'/' + imageName;
        thumbImg.src = '/'+thumbFolder+'/' + imageName;

        function allLoaded() {
            var $node = $('<a>').html(thumbImg).data('size', bigSize).attr('href', '/'+imgFolder+'/' + imageName + '?new=1').attr('data-med', '/'+thumbFolder+'/' + imageName).attr('data-med-size', thumbSize);
            if (gallery_newest_first) {
                $node.prependTo($('#galimages'));
            } else {
                $node.appendTo($('#galimages'));
            }
        }
    }

    // Open Gallery Overview
    public.openGallery = function (elem) {
        var pos = elem.offset();
        if(showScrollbarsInGallery) {
            $('.galHeader').css({
                'right': '20px',
                'width': 'auto'
            });
        }
        gallery.css({
                'left': pos.left,
                'top': pos.top
            })
            .data('left', pos.left)
            .data('top', pos.top)
            .addClass('open')
            .animate({
                'width': showScrollbarsInGallery ? '100%' : '102%',
                'height': '100%',
                'top': 0,
                'left': 0
            }, 300, function () {
                $('.galInner').show();
                gallery.css({
                    'overflow-y': 'scroll'
                });
            });
    }

    $(window).on('resize', public.handleResize);

    //Filter
    $('.imageFilter').on('click', function (e) {
        //e.preventDefault();
        if($('#mySidenav').width() > 0){
            public.closeNav();
        } else {
            public.openNav();
        }
    });

    $('.sidenav').children().on('click', function (e) {
        $('.sidenav').children().removeAttr("class");
        $(this).addClass("activeSidenavBtn");
        imgFilter = $(this).attr("id");
        if (isdev) {
            console.log(imgFilter);
        }
    });

    // Open QR Code in Gallery

    // Take Picture Button
    $('.takePic, .newpic').on('click', function (e) {
        e.preventDefault();
        var target = $(e.target);
        var photoStyle = 'photo';
        if (target.hasClass('gallery')) {
            public.openGallery(target);
        } else {
            if (!processing) {
                if($('#mySidenav').width() > 0){
                    public.closeNav();
                }
                public.reset();
                if(useVideo && navigator.mediaDevices){
                    navigator.getMedia = (navigator.mediaDevices.getUserMedia || navigator.mediaDevices.webkitGetUserMedia || navigator.mediaDevices.mozGetUserMedia || false);
                    if(navigator.getMedia) {
                        navigator.mediaDevices.getUserMedia(webcamConstraints)
                        .then(function(stream) {
                            $('video').show();
                            var video = document.getElementById('video');
                            video.srcObject = stream;
                            public.stream = stream;
                        })
                        .catch(function (error) {
                        });
                    }
                }
                loader.slideDown('slow', 'easeOutBounce', function () {
                    public.countdown(countDown, $('#counter'),photoStyle);
                });
            }
        }
    });

    // Take Collage Button
    $('.takeCollage, .newcollage').on('click', function (e) {
        e.preventDefault();
        var target = $(e.target);
        var photoStyle = 'collage';
        if (isdev) {
            console.log("collage");
        }
        if (target.hasClass('gallery')) {
            public.openGallery(target);
        } else {
            if (!processing) {
                if($('#mySidenav').width() > 0){
                    public.closeNav();
                }
                public.reset();
                if(useVideo && navigator.mediaDevices){
                    navigator.getMedia = (navigator.mediaDevices.getUserMedia || navigator.mediaDevices.webkitGetUserMedia || navigator.mediaDevices.mozGetUserMedia || false);
                    if(navigator.getMedia) {
                        navigator.mediaDevices.getUserMedia(webcamConstraints)
                        .then(function(stream) {
                            $('video').show();
                            var video = document.getElementById('video');
                            video.srcObject = stream;
                            public.stream = stream;
                        })
                        .catch(function (error) {
                        });
                    }
                }
                loader.slideDown('slow', 'easeOutBounce', function () {
                    if (isdev) {
                        console.log(photoStyle);
                    }
                    public.countdown(countDown, $('#counter'),photoStyle);
                });
            }
        }
    });

    // Open Gallery Button
    $('#result .gallery, #start .gallery').on('click', function (e) {
        e.preventDefault();
        if($('#mySidenav').width() > 0){
          public.closeNav();
        }
        public.openGallery($(this));
    });

    // Close Gallery Overview
    $('.close_gal').on('click', function (e) {
        e.preventDefault();
        $('.galInner').hide();
        gallery.css({
            'overflow-y': 'visible'
        });
        $('#gallery').animate({
            'width': '200px',
            'height': '70px',
            'left': $('#gallery').data('left'),
            'top': $('#gallery').data('top')
        }, 300, function () {
            $('#gallery').removeClass('open');
        });
    });

    $('.tabbox ul li').on('click', function () {
        var elem = $(this),
            target = $('.' + elem.data('target'));
        if (!elem.hasClass('active')) {
            $('.tabbox ul li').removeClass('active');
            $('.tab').removeClass('active');
            elem.addClass('active');
            target.addClass('active');
        }
    });
    // QR in gallery
    $(document).on('click touchstart', '.gal-qr-code', function (e) {
        e.preventDefault();

        var pswpQR = $('.pswp__qr');
        if (pswpQR.hasClass('qr-active')) {
            pswpQR.removeClass('qr-active').fadeOut('fast');
        } else {
            pswpQR.empty();
            var img = pswp.currItem.src;
            img = img.split('/').pop();

            $('<img>').attr('src', 'qrcode.php?filename=' + img).appendTo(pswpQR);

            pswpQR.addClass('qr-active').fadeIn('fast');
        }
    });
    // print in gallery
    $(document).on('click touchstart', '.gal-print', function (e) {
        e.preventDefault();
        var img = pswp.currItem.src;
        img = img.replace(imgFolder+'/', '');
        document.getElementById("print_mesg").style.display = "block";
        setTimeout(function () {
            $.ajax({
                url: 'print.php?filename=' + encodeURI(img),
            }).done(function (data) {
                if (isdev) {
                    console.log(data)
                }
                setTimeout(function () {
                    document.getElementById("print_mesg").style.display = "none";
                    pswp.close();
                },5000);
            });
        },1000);
    });

    // chroma keying print
    $(document).on('click touchstart', '.gal-print-chroma_keying', function (e) {
        e.preventDefault();
        var img = pswp.currItem.src;
        img = img.replace(imgFolder+'/', '');
        $.post( "chroma_keying/lib_php/info.php", function( info ) {
            if (info.chroma_keying == true) {
                var currentHref = $(location).attr('href').split('#')[0];;
                var encodedString = btoa(currentHref);
                //var decodedString = atob(encodedString);
                $(location).attr('href','chroma_keying/index.php?filename=' + encodeURI(img) + '&location=' + encodeURI(encodedString));
            }
        }, "json");
    });

    // Send Mail gallery
    $('.gal-mail').on('click touchstart', function (e) {
        //e.preventDefault();

        var mail = $('.send-mail');
        if (mail.hasClass('mail-active')) {
            public.resetMailForm();
            mail.removeClass('mail-active').fadeOut('fast');
        } else {
            mail.addClass('mail-active').fadeIn('fast');
        }
    });

    $('.mailbtn').on('click', function (e) {
        var mail = $('.send-mail');
        if (mail.hasClass('mail-active')) {
            public.resetMailForm();
            mail.removeClass('mail-active').fadeOut('fast');
        } else {
            mail.addClass('mail-active').fadeIn('fast');
        }
    });

    $('#send-mail-form').on('submit', function (e) {
        e.preventDefault();
        var img = '';
        if($('.pswp.pswp--open.pswp--visible').length) {
            img = pswp.currItem.src;
        } else {
            img = resultPage.css("background-image").replace('url(','').replace(')','').replace(/\"/gi, "").split('/'+imgFolder+'/')[1];
        }

        img = img.replace('/'+imgFolder+'/', '');
        img = img.replace('/'+thumbFolder+'/', '');

        $('#mail-form-image').val(img);
        var message = $('#mail-form-message');
        message.empty();

        var form = $(this);
        var oldValue = form.find('.btn').html();
        form.find('.btn').html('<i class="fa fa-spinner fa-spin"></i>');
        $.ajax({
            url: 'sendPic.php',
            type: 'POST',
            data: form.serialize(),
            dataType: "json",
            cache: false,
            success: function (result) {
                if (result.success === true) {
                    message.fadeIn().html('<span style="color:green">' + L10N.mailSent + '</span>');
                } else {
                    message.fadeIn().html('<span style="color:red">' + result.error + '</span>');
                }
            },
            error: function (xhr, status, error) {
                message.fadeIn('fast').html('<span style="color: red;">' + L10N.mailError + '</span>');
            },
            complete: function () {
                form.find('.btn').html(oldValue);
            }
        });
    });

    $('#send-mail-close').on('click', function (e) {
        public.resetMailForm();
        $('.send-mail').removeClass('mail-active').fadeOut('fast');
    });

    public.resetMailForm = function() {
        $('#send-mail-form').trigger('reset');
        $('#mail-form-message').html('');
    };

    $('#result').on('click', function (e) {
        var target = $(e.target);

        // Menü in and out
        if (!target.hasClass('qrbtn') && target.closest('.qrbtn').length == 0 && !target.hasClass('newpic') && !target.hasClass('printbtn') && target.closest('.printbtn').length == 0 && !target.hasClass('resetBtn') && !target.hasClass('gallery') && qr != true && !target.hasClass('homebtn') && target.closest('.homebtn').length == 0  && !target.hasClass('mailbtn')) {
            if ($('.resultInner').hasClass('hidden')) {
                $('.resultInner').stop().animate({
                    'bottom': '50px'
                }, 400).removeClass('hidden');
            } else {
                $('.resultInner').stop().animate({
                    'bottom': '-100px'
                }, 400).addClass('hidden');
            }
        }

        if (qr && !target.hasClass('qrbtn')) {
            var qrpos = $('.qrbtn').offset(),
            qrbtnwidth = $('.qrbtn').outerWidth(),
            qrbtnheight = $('.qrbtn').outerHeight()
            $('.qr').removeClass('active');
            $('.qr').animate({
                'width': qrbtnwidth,
                'height': qrbtnheight,
                'left': qrpos.left,
                'top': qrpos.top,
                'margin-left': 0,
            }, 250, function(){
                $('.qr').hide();
            });
            qr = false;
        }

        // Go to Home
        if (target.hasClass('homebtn') || target.closest('.homebtn').length > 0) {
            window.location = window.location.origin;
        }

        // Qr in and out
        if (target.hasClass('qrbtn') || target.closest('.qrbtn').length > 0) {

            var qrpos = $('.qrbtn').offset(),
            qrbtnwidth = $('.qrbtn').outerWidth(),
            qrbtnheight = $('.qrbtn').outerHeight()

            if (qr) {
                $('.qr').removeClass('active');
                $('.qr').animate({
                    'width': qrbtnwidth,
                    'height': qrbtnheight,
                    'left': qrpos.left,
                    'top': qrpos.top,
                    'margin-left': 0,
                }, 250, function(){
                $('.qr').hide();
            });
                qr = false;
            } else {
                qr = true;
                $('.qr').css({
                'width': qrbtnwidth,
                'height': qrbtnheight,
                'left': qrpos.left,
                'top': qrpos.top
                });
                $('.qr').show();
                $('.qr').animate({
                    'width': 500,
                    'height': 600,
                    'left': '50%',
                    'margin-left': -265,
                    'top': 50
                }, 250, function(){
                    $('.qr').addClass('active');
                });
            }
        }
    });

    // Show QR Code
    $('.qrbtn').on('click', function (e) {
        e.preventDefault();
    });

    $('.printbtn').on('click', function (e) {
        e.preventDefault();
    });

    $('.homebtn').on('click', function (e) {
        e.preventDefault();
    });

    // Countdown Function
    public.countdown = function (calls, element, photoStyle) {
        count = 0;
        current = calls;
        if (isdev) {
            console.log(photoStyle);
        }
        var timerFunction = function () {
            element.text(current);
            current--;
            TweenLite.to(element, 0.0, {
                scale: 8,
                opacity: 0.2
            });
            TweenLite.to(element, 0.75, {
                scale: 1,
                opacity: 1
            });

            if (count < calls) {
                window.setTimeout(timerFunction, 1000);
            } else {
                if (isdev) {
                    console.log(photoStyle);
                }
                public.cheese(photoStyle);
            }
            count++;
        };
        timerFunction();
    }

    //////////////////////////////////////////////////////////////////////////////////////////
    ////// PHOTOSWIPE FUNCTIONS /////////////////////////////////////////////////////////////

    public.initPhotoSwipeFromDOM = function (gallerySelector) {

        // select all gallery elements
        var galleryElements = document.querySelectorAll(gallerySelector);
        for (var i = 0, l = galleryElements.length; i < l; i++) {
            galleryElements[i].setAttribute('data-pswp-uid', i + 1);
            galleryElements[i].onclick = onThumbnailsClick;
        }

        // Parse URL and open gallery if it contains #&pid=3&gid=1
        var hashData = public.photoswipeParseHash();
        if (hashData.pid > 0 && hashData.gid > 0) {
            public.openPhotoSwipe(hashData.pid - 1, galleryElements[hashData.gid - 1], true);
        }
    }

    var onThumbnailsClick = function (e) {
        e = e || window.event;
        e.preventDefault ? e.preventDefault() : e.returnValue = false;

        var eTarget = e.target || e.srcElement;

        var clickedListItem = closest(eTarget, function (el) {
            return el.tagName === 'A';
        });

        if (!clickedListItem) {
            return;
        }

        var clickedGallery = clickedListItem.parentNode;

        var childNodes = clickedListItem.parentNode.childNodes,
            numChildNodes = childNodes.length,
            nodeIndex = 0,
            index;

        for (var i = 0; i < numChildNodes; i++) {
            if (childNodes[i].nodeType !== 1) {
                continue;
            }

            if (childNodes[i] === clickedListItem) {
                index = nodeIndex;
                break;
            }
            nodeIndex++;
        }

        if (index >= 0) {
            public.openPhotoSwipe(index, clickedGallery);
        }
        return false;
    };

    public.photoswipeParseHash = function () {
        var hash = window.location.hash.substring(1),
            params = {};

        if (hash.length < 5) { // pid=1
            return params;
        }

        var vars = hash.split('&');
        for (var i = 0; i < vars.length; i++) {
            if (!vars[i]) {
                continue;
            }
            var pair = vars[i].split('=');
            if (pair.length < 2) {
                continue;
            }
            params[pair[0]] = pair[1];
        }

        if (params.gid) {
            params.gid = parseInt(params.gid, 10);
        }

        if (!params.hasOwnProperty('pid')) {
            return params;
        }
        params.pid = parseInt(params.pid, 10);
        return params;
    };

    // Get Items for Photoswipe Gallery
    public.parseThumbnailElements = function (el) {
        var thumbElements = el.childNodes,
            numNodes = thumbElements.length,
            items = [],
            el,
            childElements,
            thumbnailEl,
            size,
            item;

        for (var i = 0; i < numNodes; i++) {
            el = thumbElements[i];

            // include only element nodes
            if (el.nodeType !== 1) {
                continue;
            }

            childElements = el.children;
            size = $(el).data('size').split('x');

            // create slide object
            item = {
                src: el.getAttribute('href'),
                w: parseInt(size[0], 10),
                h: parseInt(size[1], 10),
                author: el.getAttribute('data-author')
            };

            item.el = el; // save link to element for getThumbBoundsFn

            if (childElements.length > 0) {
                item.msrc = childElements[0].getAttribute('src'); // thumbnail url
                if (childElements.length > 1) {
                    item.title = childElements[1].innerHTML; // caption (contents of figure)
                }
            }


            var mediumSrc = el.getAttribute('data-med');
            if (mediumSrc) {
                size = el.getAttribute('data-med-size').split('x');
                // "medium-sized" image
                item.m = {
                    src: mediumSrc,
                    w: parseInt(size[0], 10),
                    h: parseInt(size[1], 10)
                };
            }
            // original image
            item.o = {
                src: item.src,
                w: item.w,
                h: item.h
            };

            items.push(item);
        }

        return items;
    };

    public.openPhotoSwipe = function (index, galleryElement, disableAnimation) {
        var pswpElement = document.querySelectorAll('.pswp')[0],
            gallery,
            options,
            items;

        items = public.parseThumbnailElements(galleryElement);

        // define options (if needed)
        options = {
            index: index,

            galleryUID: galleryElement.getAttribute('data-pswp-uid'),

            getThumbBoundsFn: function (index) {
                // See Options->getThumbBoundsFn section of docs for more info
                var thumbnail = items[index].el.children[0],
                    pageYScroll = window.pageYOffset || document.documentElement.scrollTop,
                    rect = thumbnail.getBoundingClientRect();

                return {
                    x: rect.left,
                    y: rect.top + pageYScroll,
                    w: rect.width
                };
            },
            shareEl: false,
            zoomEl: false,
            fullscreenEl: false,
            addCaptionHTMLFn: function (item, captionEl, isFake) {
                if (!item.title) {
                    captionEl.children[0].innerText = '';
                    return false;
                }
                captionEl.children[0].innerHTML = item.title + '<br/><small>Photo: ' + item.author + '</small>';
                return true;
            }

        };

        var radios = document.getElementsByName('gallery-style');
        for (var i = 0, length = radios.length; i < length; i++) {
            if (radios[i].checked) {
                if (radios[i].id == 'radio-all-controls') {

                } else if (radios[i].id == 'radio-minimal-black') {
                    options.mainClass = 'pswp--minimal--dark';
                    options.barsSize = {
                        top: 0,
                        bottom: 0
                    };
                    options.captionEl = false;
                    options.fullscreenEl = false;
                    options.shareEl = false;
                    options.bgOpacity = 0.85;
                    options.tapToClose = true;
                    options.tapToToggleControls = false;
                }
                break;
            }
        }

        if (disableAnimation) {
            options.showAnimationDuration = 0;
        }

        // Pass data to PhotoSwipe and initialize it
        pswp = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, options);

        // see: http://photoswipe.com/documentation/responsive-images.html
        var realViewportWidth,
            useLargeImages = false,
            firstResize = true,
            imageSrcWillChange;

        pswp.listen('beforeResize', function () {

            var dpiRatio = window.devicePixelRatio ? window.devicePixelRatio : 1;
            dpiRatio = Math.min(dpiRatio, 2.5);
            realViewportWidth = pswp.viewportSize.x * dpiRatio;


            if (realViewportWidth >= 1200 || (!pswp.likelyTouchDevice && realViewportWidth > 800) || screen.width > 1200) {
                if (!useLargeImages) {
                    useLargeImages = true;
                    imageSrcWillChange = true;
                }

            } else {
                if (useLargeImages) {
                    useLargeImages = false;
                    imageSrcWillChange = true;
                }
            }

            if (imageSrcWillChange && !firstResize) {
                pswp.invalidateCurrItems();
            }

            if (firstResize) {
                firstResize = false;
            }

            imageSrcWillChange = false;

        });

        pswp.listen('gettingData', function (index, item) {
            if (useLargeImages) {
                item.src = item.o.src;
                item.w = item.o.w;
                item.h = item.o.h;
            } else {
                item.src = item.m.src;
                item.w = item.m.w;
                item.h = item.m.h;
            }
        });

        pswp.listen('beforeChange', function () {
            $('.pswp__qr').removeClass('qr-active').fadeOut('fast');
            public.resetMailForm();
            $('.send-mail').removeClass('mail-active').fadeOut('fast');
        });

        pswp.listen('close', function () {
            $('.pswp__qr').removeClass('qr-active').fadeOut('fast');
            public.resetMailForm();
            $('.send-mail').removeClass('mail-active').fadeOut('fast');
        });

        pswp.init();


    };

    // find nearest parent element
    var closest = function closest(el, fn) {
        return el && (fn(el) ? el : closest(el.parentNode, fn));
    };
    //////////////////////////////////////////////////////////////////////////////////////////


    // clear Timeout to not reset the gallery, if you clicked anywhere
    $(document).on('click', function (event) {
        if (startPage.is(':visible')) {

        } else {
            clearTimeout(timeOut);
            public.resetTimeOut();
        }
    });
    // Disable Right-Click
    if (!isdev) {
        $(this).on("contextmenu", function (e) {
            e.preventDefault();
        });
    }

    return public;
})();

// Init on domready
$(function () {
    photoBooth.init();
});
