/***
 * Copyright (c) 2015, Dan Hasting
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the organization nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 ***/

var vGallery = function(config) {
    var vg = this;

    /**
     * vg.init initializes the class parameters
     */
    vg.init = function() {
        c = config;

        // Show errors for missing required configuration options
        if (c.gallery === undefined)    vg.log('gallery_missing');
        if (c.images === undefined)     vg.log('images_missing');

        // Grab configuration options or set default values
        vg.gallery      = (c.gallery !== undefined)         ? c.gallery         : null;
        vg.images       = (c.images !== undefined)          ? c.images          : null;
        vg.thumbs       = (c.thumbs !== undefined)          ? c.thumbs          : null;
        vg.nav          = (c.nav !== undefined)             ? c.nav             : null;
        vg.nav_buttons  = (c.nav_buttons !== undefined)     ? c.nav_buttons     : true;
        vg.prev         = (c.prev !== undefined)            ? c.prev            : null;
        vg.next         = (c.next !== undefined)            ? c.next            : null;
        vg.prev_text    = (c.prev_text !== undefined)       ? c.prev_text       : '&laquo;';
        vg.next_text    = (c.next_text !== undefined)       ? c.next_text       : '&raquo;';
        vg.prev_image   = (c.prev_image !== undefined)      ? c.prev_image      : null;
        vg.next_image   = (c.next_image !== undefined)      ? c.next_image      : null;
        vg.captions     = (c.captions !== undefined)        ? c.captions        : null;
        vg.links        = (c.links !== undefined)           ? c.links           : null;
        vg.text         = (c.text !== undefined)            ? c.text            : null;
        vg.text_element = (c.text_element !== undefined)    ? c.text_element    : null;
        vg.auto         = (c.auto !== undefined)            ? c.auto            : true;
        vg.delay        = (c.delay !== undefined)           ? c.delay           : 5000;
        vg.fade         = (c.fade !== undefined)            ? c.fade            : 1000;
        vg.bg_color     = (c.bg_color !== undefined)        ? c.bg_color        : '#FFF';
        vg.button_color = (c.button_color !== undefined)    ? c.button_color    : '#000';
        vg.active_color = (c.active_color !== undefined)    ? c.active_color    : '#000';
        vg.contain      = (c.contain !== undefined)         ? c.contain         : 'none';

        // Check that other configuration arrays have same length as images array
        if (vg.thumbs && vg.images.length != vg.thumbs.length)       vg.log('thumbs_count');
        if (vg.links && vg.images.length != vg.links.length)         vg.log('links_count');
        if (vg.captions && vg.images.length != vg.captions.length)   vg.log('captions_count');

        vg.active = false;
        vg.current = vg.images.length * 10000; // High number so we will never go below 0

        // Thumbnail navigator shows 5 images, so make sure we have enough in the rotation
        // that user never sees a blank thumbnail
        iterations_array = {4:3, 3:4, 2:5, 1:10};
        if (iterations_array[vg.images.length])
            vg.thumb_iterations = iterations_array[vg.images.length];
        else
            vg.thumb_iterations = (vg.images.length > 10) ? 1 : 2;

        // Calculate thumbnail size and padding based on how large the nav element is
        vg.thumb_hpadding = Math.round($(vg.nav).width() * 0.015);
        vg.thumb_vpadding = Math.round($(vg.nav).width() * 0.01);
        vg.thumbs_wrapper_width = $(vg.nav).width() - (vg.thumb_hpadding * 2);
        if (vg.nav_buttons) vg.thumbs_wrapper_width = vg.thumbs_wrapper_width - 80;
        vg.thumb_width = Math.round((vg.thumbs_wrapper_width - (vg.thumb_hpadding * 4)) / 5);
        vg.thumb_height = Math.round($(vg.nav).height() - (vg.thumb_vpadding * 2));
        vg.nav_wrapper_padding = ($(vg.nav).height() - vg.thumb_height) / 2;

        // Calculate position of thumbnails
        vg.thumb_offset = vg.thumb_width + vg.thumb_hpadding;
        vg.thumb_most_left = 3 * vg.thumb_offset * -1;
        vg.thumb_most_right = (vg.images.length * vg.thumb_iterations - 3) * vg.thumb_offset;
        vg.thumb_wrap = Math.abs(vg.thumb_most_left) + vg.thumb_most_right;
    };

    /**
     * vg.start is used to initialize the gallery and navigation elements
     * and start the rotation timer.
     */
    vg.start = function() {
        vg.insertCSS();
        vg.createGallery();
        if (vg.nav) vg.createNavigator();
        if (vg.prev) vg.createButton('prev', false);
        if (vg.next) vg.createButton('next', false);
        if (vg.text && vg.text_element) vg.createText();

        vg.preloadImage();
        if (vg.auto) vg.timeout = setTimeout(function(){vg.changeImage(1);}, vg.delay);
    };

    /**
     * vg.log displays a message to the Javascript console
     *
     * @param value Key of message to display.
     */
    vg.log = function(value) {
        var values = value.split('_');

        switch (values[1]) {
            case 'missing':
                console.error("vGallery.js: '%s' is missing from the class "+
                              "initialization. Please add it.", values[0]);
                break;
            case 'count':
                console.warn("vGallery.js: Number of %s does not equal number of "+
                             "images. This will cause unintended consequences.", values[0]);
                break;
        }
    };

    /**
     * vg.insertCSS inserts the CSS rules into the DOM. This is so we don't have to
     * distribute a static CSS file.
     */
    vg.insertCSS = function() {
        $("<style>").prop("type", "text/css").html(
            "#vg_wrapper {position:relative;width:100%;height:100%;}"+
            "#vg_click {z-index:96;position:absolute;top:0;left:0;width:100%;height:100%;}"+
            "#vg_animator {z-index:95;position:absolute;top:0px;left:0px;width:100%;height:100%;}"+
            "#vg_background {z-index:94;position:absolute;top:0px;left:0px;width:100%;"+
                "height:100%;}"+
            ".vg_cover {background-size:cover !important;}"+
            ".vg_contain {background-size:contain !important;}"+
            "#vg_navigator_wrapper {position:absolute;right:50%;}"+
            "#vg_navigator {z-index:97;position:relative;left:50%;padding-top:8px; }"+
            "#vg_prev, #vg_next {display:block;z-index:97;position:relative;color:#FFF;"+
                "text-decoration:none;font-size:40px;text-align:center;}"+
            "#vg_prev > div, #vg_next > div, #vg_navigator_prev > div, "+
                "#vg_navigator_next > div {height:100%;width:100%;}"+
            "#vg_navigator_prev, #vg_navigator_next {display:block;float:left;width:40px;"+
                "color:#000;text-decoration:none;font-size:40px;text-align:center;"+
                "position:relative;}"+
            ".vg_thumb_caption {z-index:98;position:absolute;bottom:0px;width:100%;height:18px;"+
                "line-height:17px;font-size:11px;color:#FFF;font-weight:bold;background:#000;"+
                "background:rgba(0,0,0,0.7);text-align:center;}"+
            "#vg_navigator_thumbs {position:relative;float:left;overflow:hidden;}"+
            ".vg_navigator_action, #vg_navigator_current {z-index:99;position:absolute;"+
                "cursor:pointer;background:url(i/iefix.png);}"+
            ".vg_navigator_thumb {z-index:98;position:absolute;top:0;overflow:hidden;}"+
            ".vg_thumb_border {z-index:99;position:absolute;opacity:0;}"+
            ".vg_navigator_thumb img {position:absolute;}"
        ).appendTo("head");
    };

    /**
     * vg.createGallery initializes the gallery element and preloads the first image.
     */
    vg.createGallery = function() {
        $('<div/>', {id: 'vg_wrapper'}     ).appendTo(vg.gallery);
        $('<div/>', {id: 'vg_click'}       ).appendTo('#vg_wrapper');
        $('<div/>', {id: 'vg_animator'}    ).appendTo('#vg_wrapper');
        $('<div/>', {id: 'vg_background'}  ).appendTo('#vg_wrapper');

        firstImage = new Image();
        firstImage.src = vg.getImage();
        firstImage.onload = function() {
            vg.setBackground("#vg_animator", this.width / this.height);
            vg.setBackground("#vg_background", this.width / this.height);
            if (vg.links) vg.setLink();
        };
    };

    /**
     * vg.createText creates the initializes the text element.
     */
    vg.createText = function() {
        $('<div/>', {id: 'vg_text_inner'} ).appendTo(vg.text_element);
        $('#vg_text_inner').html(vg.text[vg.current % vg.images.length]);
    };

    /**
     * vg.createNavigator initializes the navigation element.
     */
    vg.createNavigator = function() {
        $('<div/>', {id: 'vg_navigator_wrapper'}).appendTo(vg.nav);
        var wrapper_style = 'height:'+vg.thumb_height+'px;'+
                            'width:'+$(vg.nav).width()+'px;'+
                            'padding:'+vg.nav_wrapper_padding+'px 0;';
        $('<div/>', {id: 'vg_navigator', style: wrapper_style}).appendTo('#vg_navigator_wrapper');

        // Create previous button
        if (vg.nav_buttons) vg.createButton('prev', true);

        var thumbs_style = 'height:'+$(vg.nav).height()+'px;'+
                           'width:'+vg.thumbs_wrapper_width+'px;'+
                           'margin:0 '+vg.thumb_hpadding+'px;';
        $('<div/>', {id: 'vg_navigator_thumbs', style: thumbs_style}).appendTo('#vg_navigator');

        // Create clickable placeholders. The thumbnail images will move under these.
        for (i = -2; i <= 2; i++) {
            position = vg.thumb_offset * (i + 2);
            width   = (i === 0) ? vg.thumb_width - 2   : vg.thumb_width;
            height  = (i === 0) ? vg.thumb_height - 2  : vg.thumb_height;
            prop = {
                class: 'vg_navigator_action',
                'data-offset': i,
                style: 'left:'+position+'px;'+
                       'height:'+height+'px;'+
                       'width:'+width+'px;',
            };
            if (i === 0) prop.id = 'vg_navigator_current';
            $('<div/>', prop).appendTo('#vg_navigator_thumbs');
        }
        $('.vg_navigator_action').each(function() {
            $(this).click(function() {
                vg.changeImage($(this).data('offset'));
            });
        });

        // Create thumbnail images
        for (i = 0; i < vg.images.length * vg.thumb_iterations; i++) {
            position = vg.thumb_offset * (i - 3);

            // Need to account for the fact the first image is the 6th (including hidden)
            // shown in the thumbnail rotator
            adjust = i + vg.images.length * 10 - 5;

            current_thumb = vg.getThumbImage(adjust);
            prop = {
                id: 'vg_thumb_'+i,
                class: 'vg_navigator_thumb',
                style: 'left:'+position+'px;'+
                       'height:'+vg.thumb_height+'px;'+
                       'width:'+vg.thumb_width+'px;',
            };
            $('<div/>', prop).appendTo('#vg_navigator_thumbs');

            if (vg.captions) {
                $('<div/>', {class:'vg_thumb_caption'}).appendTo('#vg_thumb_'+i);
                caption = vg.captions[adjust % vg.images.length];
                $('#vg_thumb_'+i+' .vg_thumb_caption').html(caption);
            }

            var border_style = 'height:'+(vg.thumb_height-2)+'px;'+
                               'width:'+(vg.thumb_width-2)+'px;'+
                               'border:1px solid '+vg.active_color+';';
            if (i == 5) border_style += 'opacity:1;';
            $('<div/>', {class:'vg_thumb_border', style: border_style}).appendTo('#vg_thumb_'+i);

            var thumb_style = 'background: url('+vg.getThumbImage(adjust)+') no-repeat 50% 50%;'+
                              'background-size: cover;'+
                              'height:'+vg.thumb_height+'px;'+
                              'width:'+vg.thumb_width+'px;';
            $('<div/>', {class:'vg_thumb_image', style: thumb_style}).appendTo('#vg_thumb_'+i);
        }

        // Create next button
        if (vg.nav_buttons) vg.createButton('next', true);
    };

    /**
     * vg.createButton creates the 'prev' and 'next' buttons
     *
     * @param button The button to create: 'prev' or 'next'.
     * @param nav Whether button appears in nav or in free-standing element
     */
    vg.createButton = function(button, nav) {
        image = (button == 'prev') ? vg.prev_image : vg.next_image;

        if (nav) {
            parent = '#vg_navigator';
            element = 'vg_navigator_'+button;
            button_style = 'height:'+vg.thumb_height+'px;'+
                           'line-height:'+(vg.thumb_height-6)+'px;';
        } else {
            parent = (button == 'prev') ? vg.prev : vg.next;
            element = 'vg_'+button;
            button_style = 'line-height:'+($(parent).height()-6)+'px;'+
                           'height:'+$(parent).height()+'px;'+
                           'width:'+$(parent).width()+'px;';
        }
        if (!image) button_style += 'color:'+vg.button_color+';';

        $('<a/>', {id: element, href: '#', style: button_style}).appendTo(parent);

        if (image) {
            var button_img_style = 'background: url('+image+') no-repeat 50% 50%;'+
                                   'background-size: contain;';
            $('<div/>', {style: button_img_style}).appendTo('#'+element);
        } else {
            $('#'+element).html((button == 'prev') ? vg.prev_text : vg.next_text);
        }

        $('#'+element).click(function() {
            vg.changeImage((button == 'prev') ? -1 : 1);
        });
    };

    /**
     * vg.getImage returns a given image from the image array.
     *
     * @param image Image to fetch, defaults to vg.current.
     */
    vg.getImage = function(image) {
        if (!image) image = vg.current;
        return vg.images[image % vg.images.length];
    };

    /**
     * vg.getThumbImage returns a given thumbnail image if provided, or the full image.
     *
     * @param image Image to fetch, defaults to vg.current.
     */
    vg.getThumbImage = function(image) {
        if (!image) image = vg.current;
        if (vg.thumbs)
            return vg.thumbs[image % vg.images.length];
        else
            return vg.images[image % vg.images.length];
    };

    /**
     * vg.preloadImage preloads the next image so there is no delay in the rotation
     */
    vg.preloadImage = function() {
        nextImage = new Image();
        nextImage.src = vg.getImage(vg.current + 1);
    };

    /**
     * vg.setBackground sets the css background property and cover/contain class
     * for the given element
     *
     * @param e The element to modify.
     * @param ratio The image aspect ratio used to determine cover or contain.
     */
    vg.setBackground = function(e, ratio) {
        background = vg.bg_color+' url('+vg.getImage()+') no-repeat 50% 50%';
        $(e).css('background', background);

        if (vg.contain == 'all' ||
            (vg.contain == 'landscape' && ratio > 1) ||
            (vg.contain == 'portrait' && ratio <= 1)
           ) {
            $(e).removeClass('vg_cover').addClass('vg_contain');
        } else {
            $(e).removeClass('vg_contain').addClass('vg_cover');
        }
    };

    /**
     * vg.setLink attaches a URL to the #vg_click element above the image
     */
    vg.setLink = function() {
        link = vg.links[vg.current % vg.images.length];
        if (link) {
            $('#vg_click').css('cursor','pointer').attr('onclick',"location.href='"+link+"';");
        } else {
            $('#vg_click').css('cursor','default').attr('onclick','');
        }
    };

    /**
     * vg.adjustThumb adjusts the position of thumbnails by the given offset
     *
     * @param e The thumbnail element to adjust.
     * @param offset The offset to adjust the thumbnail element by.
     */
    vg.adjustThumb = function(e, offset) {
        origin = parseInt($(e).css('left').replace('px', ''));
        destination = origin + (vg.thumb_offset * offset * -1);

        if (destination < vg.thumb_most_left) {
            position = destination + vg.thumb_wrap;
            $(e).css('left', position+'px');
        } else if (destination > vg.thumb_most_right) {
            position = destination - vg.thumb_wrap;
            $(e).css('left', position+'px');
        } else {
            $(e).animate({left: destination+'px'}, vg.fade);
        }

        if (destination == vg.thumb_offset * 2)
            $(e).children('.vg_thumb_border').animate({opacity: 1}, vg.fade);
        else if (origin == vg.thumb_offset * 2)
            $(e).children('.vg_thumb_border').animate({opacity: 0}, vg.fade);
    };

    /**
     * vg.changeImage is where the real action occurs. This animates the transition.
     *
     * @param offset The image offset to adjust to. Positive for forward in the
     *            image array and negative for backwards.
     */
    vg.changeImage = function(offset) {
        // Don't allow image to change if animation is occuring or no offset
        if (vg.active || offset === 0) return;

        vg.current = vg.current + offset;

        img = new Image();
        img.src = vg.getImage();
        img.onload = function() {
            if (vg.auto) clearTimeout(vg.timeout);
            vg.active = true;

            ratio = this.width / this.height;
            vg.setBackground('#vg_background', ratio);

            $('#vg_animator').animate({opacity: 0}, vg.fade, function() {
                vg.setBackground(this, ratio);
            }).animate({opacity: 1}, 200, function() {
                if (vg.links) vg.setLink();
                vg.active = false;
                if (vg.auto) vg.timeout = setTimeout(function(){vg.changeImage(1);}, vg.delay);
                vg.preloadImage();
            });

            if (vg.nav) {
                $('.vg_navigator_thumb').each(function() {
                    vg.adjustThumb(this, offset);
                });
            }

            if (vg.text && vg.text_element) {
                $('#vg_text_inner').animate({opacity: 0}, vg.fade / 2, function() {
                    $('#vg_text_inner').html(vg.text[vg.current % vg.images.length]);
                }).animate({opacity: 1}, vg.fade / 2);
            }
        };
    };

    // Initialize the class parameters
    vg.init();
};
