# vGallery.js [![Build Status](https://travis-ci.org/dh4/vGallery.js.svg?branch=master)](https://travis-ci.org/dh4/vGallery.js)

vGallery.js is a responsive, jQuery-based image fader designed to be as versatile as possible. It was born out of my frustration attempting to find an image gallery that was versatile enough for me to style it to display the way I wanted for various different use cases. Every one I found was designed to be basically immutable with a certain look or orientation in mind, making it difficult to style without resorting to hacks.

vGallery.js is designed to allow the developer to heavily customize the location and look of the gallery elements (gallery, navigation, buttons, links, supporting text). As such, it requires you to at least have a good knowledge of HTML/CSS to make use of it.

It makes liberal use of `background-size` which is not supported in IE8 and below. If you are looking for an image gallery that displays well in those browsers, this is not for you.

Click on the following demos to view them (you can view the source code in the demos directory):

[<img src="https://dl.dropboxusercontent.com/u/232085155/vGallery.js/large.jpg" alt="Large Demo" height="150" />](https://dh4.github.io/vGallery.js/demos/large.html)
[<img src="https://dl.dropboxusercontent.com/u/232085155/vGallery.js/small.jpg" alt="Small Demo" height="150" />](https://dh4.github.io/vGallery.js/demos/small.html)
[<img src="https://dl.dropboxusercontent.com/u/232085155/vGallery.js/jumbotron.jpg" alt="Jumbotron Demo" height="150" />](https://dh4.github.io/vGallery.js/demos/jumbotron.html)


## Usage

Make sure you have [jQuery](https://jquery.com/) installed.

Download the latest release from the [releases](https://github.com/dh4/vGallery.js/releases) page and install it into the \<head\> tag of the page you want the gallery to show:
```
<script type="text/javascript" src="vgallery-<VERSION>.min.js"></script>
```

Then initialize the gallery by creating a new vGallery object and calling start(). The following should be placed before the \</body\> tag:
```
<script type="text/javascript">
$(document).ready(function() {
    var vg = new vGallery({
        gallery: '#gallery',
        images: [
            'path/to/image/one.jpg',
            'path/to/image/two.jpg'
        ]
    });
    vg.start();
});
</script>
```

The above shows the minimal configuration. See the configuration section below for more options.

### Styling

vGallery.js is not designed to display a styled gallery by default. It requires you to style the elements used (`gallery` and `nav`, `prev`, `next`, `text` if they are used). At a bare minimum, you will need to add a height and width to the `gallery` element.

Look at the examples in the demos directory for good starting points on styling the gallery.


## Configuration

The following configuration options are available. The only required configuration options are `gallery` and `images`.

##### gallery

The element to display the gallery in. You can style this element how you want, but the contents should be empty.

##### images

An array of images to display. You can use absolute or relative paths.

##### thumbs

An array of thumbnails to use. This should match up with the `images` array and have the same number of items. If not specified, vGallery.js will use the `images` array for thumbnails instead.

##### nav

The element to display the navigation in. You can style this element to your liking, but it should be empty.

##### nav_buttons

Boolean to show or hide the prev/next buttons in the navigation element. Default is `true`.

##### prev

Element to display an additional previous button within.

##### next

Element to display an additional next button within.

##### prev_text

Text to use for previous button. Default is `&laquo;`.

##### next_text

Text to use for next button. Default is `&raquo;`.

##### prev_image

Path to image to use for previous button. Overrides `prev_text`.

##### next_image

Path to image to use for next button. Overrides `next_text`.

##### captions

Array of captions to display below the thumbnail images in the navigation. This should have the same number of items as the `images` array.

##### links

Array of links to attach to images within the gallery. Can use `null` as an item if no link is desired for a certain image. This should have the same number of items as the `images` array.

##### text

Array of rotating text to display within the `text_element`. You can use HTML as well as plain text. This should have the same number of items as the `images` array.

##### text_element

Element to display rotating text within. You can style this element to your liking, but it should be empty.

##### auto

Boolean to automatically advance the gallery based on `delay`. Default is `true`.

##### delay

Time in milliseconds to wait before advancing the gallery. Default is `5000` (5 seconds).

##### fade

Time in milliseconds the fade animation will last. Default is `1000` (1 second).

##### bg_color

The color to fill blank areas when an image does not fully cover the gallery element. Default is `#FFF`.

##### button_color

The text color to use for the prev/next buttons. Default is `#000`.

##### active_color

The border color around the active thumbnail. Default is `#000`.

##### contain

What images should use `background-size:contain` vs `background-size:cover`. There are five options:  
`none`: All images will be cropped to fill the gallery element.  
`all`: All images will be contained within the gallery element and no cropping will occur.  
`portrait`: Only portrait images will be contained within the gallery. Landscape images will be cropped to fill the gallery element.  
`landscape`: Only landscape images will be contained within the gallery. Portrait images will be cropped.  
`parent`: vGallery.js will use the size of the `gallery` to determine the best way to display the image. If the gallery element is in a portrait orientation, portrait images will be cropped to fill the element and landscape images will be contained within the element (and vice versa).

The default is `none`.

### Full Example

An example configuration using all options:
```
<div id="gallery"></div>
<div id="nav"></div>
<div id="prev"></div>
<div id="next"></div>
<div id="text"></div>
<script>
$(document).ready(function() {
    var vg = new vGallery({
        gallery: '#gallery',
        images: [
            'path/to/image/one.jpg',
            'path/to/image/two.jpg'
        ],
        thumbs: [
            'path/to/thumb/one.jpg',
            'path/to/thumb/two.jpg'
        ],
        nav: '#nav',
        nav_buttons: false,
        prev: '#prev',
        next: '#next',
        prev_text: '<',
        next_text: '>',
        prev_image: 'path/to/prev/image.jpg',
        next_image: 'path/to/next/image.jpg',
        captions: [
            'Caption One',
            'Caption Two'
        ],
        links: [
            'http://example.com',
            null
        ],
        text: [
            '<b>Text One</b>',
            'Text Two'
        ],
        text_element: '#text',
        auto: false,
        delay: 10000,
        fade: 500,
        bg_color: '#000',
        button_color: '#FFF',
        active_color: '#FFF',
        contain: 'portrait'
    });
    vg.start();
});
</script>
```

Also see the demos directory for more examples.


## Feedback

If you find yourself needing to hack the source code to get this to behave the way you want, please let me know by opening an [issue](https://github.com/dh4/mupen64plus-qt/issues) or submitting a pull request to make what you need configurable. My hope for this is to make it as versatile and usable as possible.
