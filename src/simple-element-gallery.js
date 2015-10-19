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

var SimpleElementGallery = function(config) {
    var seg = this;

    /**
     * seg.init initializes the class parameters
     */
    seg.init = function() {
        c = config;
        (c.gallery !== undefined)   ? seg.gallery = c.gallery      : seg.log('gallery_missing');
        (c.images !== undefined)    ? seg.images = c.images        : seg.log('images_missing');
        (c.thumbs !== undefined)    ? seg.thumbs = c.thumbs        : seg.thumbs = null;
        (c.nav !== undefined)       ? seg.nav = c.nav              : seg.nav = null;
        (c.nav_buttons !== undefined) ? seg.nav_buttons = c.nav_buttons : seg.nav_buttons = true;
        (c.prev !== undefined)      ? seg.prev = c.prev            : seg.prev = null;
        (c.next !== undefined)      ? seg.next = c.next            : seg.next = null;
        (c.prev_image !== undefined) ? seg.prev_image = c.prev_image : seg.prev_image = null;
        (c.next_image !== undefined) ? seg.next_image = c.next_image : seg.next_image = null;
        (c.captions !== undefined)  ? seg.captions = c.captions    : seg.captions = null;
        (c.links !== undefined)     ? seg.links = c.links          : seg.links = null;
        (c.text !== undefined)      ? seg.text = c.text            : seg.text = null;
        (c.text_element !== undefined) ? seg.text_element = c.text_element : seg.text_element = null;
        (c.auto !== undefined)      ? seg.auto = c.auto            : seg.auto = true;
        (c.delay !== undefined)     ? seg.delay = c.delay          : seg.delay = 5000;
        (c.fade !== undefined)      ? seg.fade = c.fade            : seg.fade = 1000;
        (c.bg_color !== undefined)  ? seg.bg_color = c.bg_color    : seg.bg_color = '#FFF';
        (c.contain !== undefined)   ? seg.contain = c.contain      : seg.contain = 'none';

        if (seg.thumbs && seg.images.length != seg.thumbs.length) seg.log('thumbs_count');
        if (seg.links && seg.images.length != seg.links.length) seg.log('links_count');
        if (seg.captions && seg.images.length != seg.captions.length) seg.log('captions_count');

        seg.active = false;
        seg.current = seg.images.length * 10000;

        // Thumbnail navigator shows 5 images, so make sure we have enough in the rotation
        // that user never sees a blank thumbnail
        iterations_array = {4:3, 3:4, 2:5, 1:10};
        (iterations_array[seg.images.length])
            ? seg.thumb_iterations = iterations_array[seg.images.length]
            : (seg.images.length > 10) ? seg.thumb_iterations = 1
                                       : seg.thumb_iterations = 2;

        // Calculate thumbnail size based on how large the nav element is
        var thumb_hpadding = Math.round($(seg.nav).width() * 0.015);
        var thumb_vpadding = Math.round($(seg.nav).width() * 0.01);
        (seg.nav_buttons) ? seg.thumbs_wrapper_width = $(seg.nav).width() - 80 - (thumb_hpadding * 2)
                          : seg.thumbs_wrapper_width = $(seg.nav).width() - (thumb_hpadding * 2);
        seg.thumb_width = Math.round((seg.thumbs_wrapper_width - (thumb_hpadding * 4)) / 5);
        seg.thumb_height = Math.round($(seg.nav).height() - (thumb_vpadding * 2));
        seg.nav_wrapper_padding = ($(seg.nav).height() - seg.thumb_height) / 2;
        seg.thumb_offset = seg.thumb_width + thumb_hpadding;
        seg.thumb_most_left = 3 * seg.thumb_offset * -1;
        seg.thumb_most_right = (seg.images.length * seg.thumb_iterations - 3) * seg.thumb_offset;
        seg.thumb_wrap = Math.abs(seg.thumb_most_left) + seg.thumb_most_right;
    }

    /**
     * seg.start is used to initialize the gallery and navigation elements
     * and start the rotation timer.
     */
    seg.start = function() {
        seg.createGallery();
        if (seg.nav) seg.createNavigator();
        if (seg.prev) seg.createButton('prev', false);
        if (seg.next) seg.createButton('next', false);
        if (seg.text && seg.text_element) seg.createText();

        seg.preloadImage();
        if (seg.auto) seg.timeout = setTimeout(function(){seg.changeImage(1)}, seg.delay);
    }

    /**
     * seg.log displays a message to the Javascript console
     *
     * @param value Key of message to display.
     */
    seg.log = function(value) {
        var values = value.split('_');

        switch (values[1]) {
            case 'missing':
                console.error("Simple Element Gallery: '%s' is missing from the class "
                             +"initialization. Please add it.", values[0]);
                break;
            case 'count':
                console.warn("Simple Element Gallery: Number of %s does not equal number of "
                            +"images. This will cause unintended consequences.", values[0]);
                break;
        }
    }

    /**
     * seg.createGallery initializes the gallery element and preloads the first image.
     */
    seg.createGallery = function() {
        $('<div/>', {id: 'seg_click'}       ).appendTo(seg.gallery);
        $('<div/>', {id: 'seg_animator'}    ).appendTo(seg.gallery);
        $('<div/>', {id: 'seg_background'}  ).appendTo(seg.gallery);

        firstImage = new Image();
        firstImage.src = seg.getImage();
        firstImage.onload = function() {
            seg.setBackground("#seg_animator", this.width / this.height);
            seg.setBackground("#seg_background", this.width / this.height);
            if (seg.links) seg.setLink();
        }
    }

    /**
     * seg.createText creates the initializes the text element.
     */
    seg.createText = function() {
        $('<div/>', {id: 'seg_text_inner'} ).appendTo(seg.text_element);
        $("#seg_text_inner").html(seg.text[seg.current % seg.images.length]);
    }

    /**
     * seg.createNavigator initializes the navigation element.
     */
    seg.createNavigator = function() {
        $('<div/>', {id: 'seg_navigator_wrapper'}).appendTo(seg.nav);
        var wrapper_style = 'height:'+seg.thumb_height+'px;'
                           +'width:'+$(seg.nav).width()+'px;'
                           +'padding:'+seg.nav_wrapper_padding+'px 0;';
        $('<div/>', {id: 'seg_navigator', style: wrapper_style}).appendTo('#seg_navigator_wrapper');

        // Create previous button
        if (seg.nav_buttons) seg.createButton('prev', true);

        var thumbs_style = 'height:'+$(seg.nav).height()+'px;'
               +'width:'+seg.thumbs_wrapper_width+'px;';
        $('<div/>', {id: 'seg_navigator_thumbs', style: thumbs_style}).appendTo('#seg_navigator');

        // Create clickable placeholders. The thumbnail images will move under these.
        for (i = -2; i <= 2; i++) {
            position = seg.thumb_offset * (i + 2);
            (i == 0) ? width = seg.thumb_width - 2 : width = seg.thumb_width;
            (i == 0) ? height = seg.thumb_height - 2 : height = seg.thumb_height;
            prop = {
                class: 'seg_navigator_action',
                'data-offset': i,
                style: 'left:'+position+'px;'
                      +'height:'+height+'px;'
                      +'width:'+width+'px;',
            }
            if (i == 0) prop.id = 'seg_navigator_current';
            $('<div/>', prop).appendTo('#seg_navigator_thumbs');
        }
        $('.seg_navigator_action').each(function() {
            $(this).click(function() {
                seg.changeImage($(this).data('offset'));
            });
        });

        // Create thumbnail images
        for (i = 0; i < seg.images.length * seg.thumb_iterations; i++) {
            position = seg.thumb_offset * (i - 3);

            // Need to account for the fact the first image is the 6th (including hidden)
            // shown in the thumbnail rotator
            adjustment = i + seg.images.length * 10 - 5;

            current_thumb = seg.getThumbImage(adjustment);
            prop = {
                id: 'seg_thumb_'+i,
                class: 'seg_navigator_thumb',
                style: 'left:'+position+'px;'
                      +'height:'+seg.thumb_height+'px;'
                      +'width:'+seg.thumb_width+'px;',
            }
            $('<div/>', prop).appendTo('#seg_navigator_thumbs');

            if (seg.captions) {
                $('<div/>', {class:'seg_thumb_caption'}).appendTo('#seg_thumb_'+i);
                caption = seg.captions[adjustment % seg.images.length];
                $('#seg_thumb_'+i+' .seg_thumb_caption').html(caption);
            }

            var border_style = 'height:'+(seg.thumb_height-2)+'px;'
                              +'width:'+(seg.thumb_width-2)+'px;';
            if (i == 5) border_style += 'opacity:1;';
            $('<div/>', {class:'seg_thumb_border', style: border_style}).appendTo('#seg_thumb_'+i);

            var thumb_style = 'background: url('+seg.getThumbImage(adjustment)+') no-repeat 50% 50%;'
                             +'background-size: cover;'
                             +'height:'+seg.thumb_height+'px;'
                             +'width:'+seg.thumb_width+'px;';
            $('<div/>', {class:'seg_thumb_image', style: thumb_style}).appendTo('#seg_thumb_'+i);
        }

        // Create next button
        if (seg.nav_buttons) seg.createButton('next', true);
    }

    /**
     * seg.createButton creates the 'prev' and 'next' buttons
     *
     * @param button The button to create: 'prev' or 'next'.
     * @param nav Whether button appears in nav or in free-standing element
     */
    seg.createButton = function(button, nav) {
        (button == 'prev') ? image = seg.prev_image : image = seg.next_image;

        if (nav) {
            parent = '#seg_navigator';
            element = 'seg_navigator_'+button;
            button_style = 'height:'+seg.thumb_height+'px;'
                          +'line-height:'+seg.thumb_height+'px;';
        } else {
            (button == 'prev') ? parent = seg.prev : parent = seg.next;
            element = 'seg_'+button;
            button_style = 'line-height:'+$(parent).height()+'px;'
                          +'height:'+$(parent).height()+'px;'
                          +'width:'+$(parent).width()+'px;';
        }
        if (!image) button_style += 'top:-3px;'

        $('<a/>', {id: element, href: '#', style: button_style}).appendTo(parent);

        if (image) {
            var button_img_style = 'background: url('+image+') no-repeat 50% 50%;'
                                  +'background-size: contain;';
            $('<div/>', {style: button_img_style}).appendTo('#'+element);
        } else {
            $('#'+element).html((button == 'prev') ? '&laquo;' : '&raquo;');
        }

        $('#'+element).click(function() {
            seg.changeImage((button == 'prev') ? -1 : 1);
        });
    }

    /**
     * seg.getImage returns a given image from the image array.
     *
     * @param image Image to fetch, defaults to seg.current.
     */
    seg.getImage = function(image) {
        if (!image) image = seg.current;
        return seg.images[image % seg.images.length];
    }

    /**
     * seg.getThumbImage returns a given thumbnail image if provided, or the full image.
     *
     * @param image Image to fetch, defaults to seg.current.
     */
    seg.getThumbImage = function(image) {
        if (!image) image = seg.current;
        if (seg.thumbs)
            return seg.thumbs[image % seg.images.length];
        else
            return seg.images[image % seg.images.length];
    }

    /**
     * seg.preloadImage preloads the next image so there is no delay in the rotation
     */
    seg.preloadImage = function() {
        nextImage = new Image();
        nextImage.src = seg.getImage(seg.current + 1);
    }

    /**
     * seg.setBackground sets the css background property and cover/contain class
     * for the given element
     *
     * @param e The element to modify.
     * @param ratio The image aspect ratio used to determine cover or contain.
     */
    seg.setBackground = function(e, ratio) {
        background = seg.bg_color+' url('+seg.getImage()+') no-repeat fixed 50% 50%';
        $(e).css('background', background);

        if (seg.contain == 'all'
            || (seg.contain == 'landscape' && ratio > 1)
            || (seg.contain == 'portrait' && ratio <= 1)
           ) {
            $(e).removeClass("seg_cover").addClass("seg_contain");
        } else {
            $(e).removeClass('seg_contain').addClass('seg_cover');
        }
    }

    /**
     * seg.setLink attaches a URL to the #seg_click element above the image
     */
    seg.setLink = function() {
        link = seg.links[seg.current % seg.images.length];
        if (link) {
            $("#seg_click").css("cursor","pointer").attr('onclick','location.href=\''+link+'\';');
        } else {
            $("#seg_click").css("cursor","default").attr('onclick','');
        }
    }

    /**
     * seg.adjustThumb adjusts the position of thumbnails by the given offset
     *
     * @param e The thumbnail element to adjust.
     * @param offset The offset to adjust the thumbnail element by.
     */
    seg.adjustThumb = function(e, offset) {
        origin = parseInt($(e).css('left').replace('px', ''));
        destination = origin + (seg.thumb_offset * offset * -1);

        if (destination < seg.thumb_most_left) {
            position = destination + seg.thumb_wrap;
            $(e).css('left', position+'px');
        } else if (destination > seg.thumb_most_right) {
            position = destination - seg.thumb_wrap;
            $(e).css('left', position+'px');
        } else {
            $(e).animate({left: destination+'px'}, seg.fade);
        }

        if (destination == seg.thumb_offset * 2)
            $(e).children('.seg_thumb_border').animate({opacity: 1}, seg.fade);
        else if (origin == seg.thumb_offset * 2)
            $(e).children('.seg_thumb_border').animate({opacity: 0}, seg.fade);
    }

    /**
     * seg.changeImage is where the real action occurs. This animates the transition.
     *
     * @param offset The image offset to adjust to. Positive for forward in the
     *            image array and negative for backwards.
     */
    seg.changeImage = function(offset) {
        // Don't allow image to change if animation is occuring or no offset
        if (seg.active || offset == 0) return;

        seg.current = seg.current + offset

        img = new Image();
        img.src = seg.getImage();
        img.onload = function() {
            if (seg.auto) clearTimeout(seg.timeout);
            seg.active = true;

            ratio = this.width / this.height;
            seg.setBackground("#seg_background", ratio);

            $("#seg_animator").animate({opacity: 0}, seg.fade, function() {
                seg.setBackground(this, ratio);
            }).animate({opacity: 1}, 0, function() {
                if (seg.links) seg.setLink();
                seg.active = false;
                if (seg.auto) seg.timeout = setTimeout(function(){seg.changeImage(1)}, seg.delay);
                seg.preloadImage();
            });

            if (seg.nav) {
                $(".seg_navigator_thumb").each(function() {
                    seg.adjustThumb(this, offset);
                });
            }

            if (seg.text && seg.text_element) {
                $("#seg_text_inner").animate({opacity: 0}, seg.fade / 2, function() {
                    $("#seg_text_inner").html(seg.text[seg.current % seg.images.length]);
                }).animate({opacity: 1}, seg.fade / 2);
            }
        }
    }

    // Initialize the class parameters
    seg.init();
}
