/*! Nova Gallery - HTML5 Multimedia Gallery - 1.2
 * Copyright 2013, Nilok Bose
 * http://codecanyon.net/user/cosmocoder
*/

(function($, document, window) {

    'use strict';

    var novaGallery = {

        init: function( $xml ) {
            // global variables for gallery
            this.config            = $xml;
            this.$novaGallery      = $('#novaGallery');
            this.$gallerySets      = $('#novaGallerySets');
            this.$galleryWrapper   = $('#novaGalleryWrapper');
            this.$filterButtons    = $('#filterButtons');
            this.$thumbGrid        = $('#novaThumbGrid');
            this.$captionTest      = $('<div id="captionTest"/>').appendTo('body');
            this.$mask             = $('<div id="thumbMask"/>').appendTo(this.$novaGallery);
            this.$overlayLoader    = $('<div id="thumbOverlayLoader"/>').appendTo(this.$novaGallery);
            this.$overlay          = $('<div id="thumbOverlay"/>').appendTo(this.$novaGallery);
            this.$overlayContent   = $('<div id="thumbOverlayContent"/>').appendTo(this.$overlay);
            this.$close            = $('<a class="close"/>').appendTo(this.$overlay);
            this.$prevItem         = $('<a class="prev-item"/>').appendTo(this.$overlay);
            this.$nextItem         = $('<a class="next-item"/>').appendTo(this.$overlay);
            this.$fullGallery      = $('#novaFull');
            this.$fwmedia          = this.$fullGallery.find('div.fwmedia');
            this.$fwActiveItem     = null;
            this.thumbMeElem       = null;
            this.thumbPlayer       = null;
            this.fwMeElem          = null;
            this.fwplayer          = null;
            this.$fwOverlay        = $('<div id="fwOverlay"/>').appendTo(this.$novaGallery);
            this.$fwOverlayContent = $('<div id="fwOverlayContent"/>').appendTo(this.$fwOverlay);
            this.displayType       = this.options.displayType;
            this.startMode         = this.options.startMode;
            this.autoplay          = this.options.autoplay;
            this.loop              = this.options.loop;
            this.storeVolume       = this.options.storeVolume;
            this.fwResize          = this.options.fullwidthResize;
            this.fwShowThumbs      = this.options.showFullwidthThumbs;
            this.thumbAppearAnim   = this.options.thumbnailsAppearAnimation;
            this.thumbCaptionAnim  = this.options.thumbnailsCaptionAnimation;
            this.homescreenAnim    = this.options.homescreenAnimation;
            this.preloadNumber     = this.options.preloadNumber;
            this.slideshow         = this.options.slideshow;
            this.pauseTime         = this.options.pauseTime;
            this.fwClock           = null;
            this.volume            = null;
            this.itemnum           = 0;
            this.thumbIndex        = 0;
            this.fwIndex           = 0;
            this.touchStartPos     = 0;
            this.touchEndPos       = 0;
            this.$window           = $(window);
            this.easing            = Modernizr.csstransitions ? 'in-out' : 'swing';
            this.filterSpeed       = 600;
            this.fwmediaSpeed      = 400;
            this.html5FS           = false;
            this.isChrome          = navigator.userAgent.match(/chrome/gi) !== null;
            this.isSafari          = navigator.userAgent.match(/webkit/gi) !== null && !this.isChrome;
            this.isOpera           = navigator.userAgent.match(/opera/gi) !== null;
            this.isiOS             = navigator.userAgent.match(/(iPad|iPhone|iPod)/gi) !== null;
            this.isAndroid         = navigator.userAgent.match(/android/i) !== null;
            this.msie              = navigator.appName.toLowerCase().indexOf('microsoft') != -1;
            this.isIE9             = this.msie && parseFloat(navigator.appVersion.split('MSIE')[1], 10) == 9;
            this.ie9js             = this.msie && window.IE7 && IE7.recalc ? true : false;
            this.hasTouch          = 'ontouchstart' in window;

            this.$overlayContent.html('<div class="details"><h2></h2><p></p></div>');
            this.$otitle = this.$overlayContent.find('h2');
            this.$odescription = this.$overlayContent.find('p');
            this.$fwOverlay.append('<a class="close"/>');


            // detect suppport for css3 features
            Modernizr.csstransforms3d && this.thumbCaptionAnim === 'flip' ? this.$thumbGrid.addClass('css3d') : (this.thumbCaptionAnim = 'fade');
            !Modernizr.csstransforms3d && this.thumbAppearAnim === 'flipSeq' ? this.thumbAppearAnim = 'fadeSeq' : this.thumbAppearAnim;
            !Modernizr.csstransitions && ($.fn.transition = $.fn.animate);

            // detect support for HTML5 Fullscreen API
            if( document.documentElement.requestFullScreen || document.documentElement.mozRequestFullScreen || document.documentElement.webkitRequestFullScreen ) {
                this.html5FS = true;
                $('#goFullscreen').show();
            }

            // detect support for touch events
            if( !this.hasTouch ) {
                this.$filterButtons.addClass('no-touch');
                this.$thumbGrid.addClass('no-touch');
                this.$novaGallery.find('menu').addClass('no-touch');
            }

            // if there are gallery sets then generate the required gallery html
            if( $xml.find('gallery').length !== 0 ) {
                var self = this;
                this.createGallerySets($xml);
                this.$gallerySets.addClass('hidden');
                this.$gallerySets.imagesLoaded(function(){
                    self.$gallerySets.removeClass('hidden');
                    self.$novaGallery.css({background: 'none', height: 'auto'});
                    self.$gallerySets.fadeIn(400, function(){
                        if( window.PIE ) {   // attach css3 pie
                            self.$gallerySets.find('img, span.number').each(function(){
                                window.PIE.attach(this);
                            });
                        }
                    });
                });
            }
            else {  // else generate html for a single gallery
                $('#gotoSets').hide();
                this.$galleryWrapper.show();
                this.showGallery();
            }

            // bind the various events in the gallery
            this.bindEvents();
        },


        // function to load the gallery xml file
        loadConfig: function(url) {
            $.ajax({
                type: 'GET',
                url: url,
                dataType: 'xml',
                global: false,
                success: function(data){
                    if( novaGallery.options.useVimeoThumbs ) {  // pull thumbnails using Vimeo api
                        var $data = $(data),
                            vimeoCalls = [],
                            vId,
                            req;

                        $data.find('file[type="video"]').find('source').filter(function(){
                            return $(this).text().indexOf('vimeo') !== -1;
                        })
                        .each(function(){
                            var $this = $(this);

                            vId = $this.text().split('/').pop();
                            req = $.ajax({
                                url: 'http://vimeo.com/api/v2/video/'+ vId +'.json',
                                dataType: 'jsonp',
                                success: function(rsp) {
                                    var thumb = data.createElement('thumbnail');
                                    thumb.appendChild( data.createTextNode(rsp[0].thumbnail_medium) );
                                    $this.before(thumb);
                                }
                            });

                            vimeoCalls.push(req);
                        });

                        $.when.apply($, vimeoCalls).done(function(){
                            novaGallery.init( $data );
                        });
                    }
                    else {
                        novaGallery.init( $(data) );
                    }
                }
            });
        },



        // function to load data from Flickr
        loadFlickrData: function(options) {
            var self = novaGallery,
                thumbSize = 'url_'+options.thumbSize,
                imageSize = 'url_'+options.imageSize,
                cacheId = '',
                flickrUrl = 'http://api.flickr.com/services/rest/?method=flickr.photos.search&api_key='+options.apiKey+'&per_page='+options.limit+'&sort='+options.sort+'&extras=url_t,url_m,url_o,url_s,url_q,url_l,url_z,description';

            if( options.sourceType === 'user' ) {
                flickrUrl += '&user_id=' + options.sourceId;
                cacheId = 'flickr-user-' + options.sourceId;
            }
            else if( options.sourceType === 'group' ) {
                flickrUrl += '&group_id=' + options.sourceId;
                cacheId = 'flickr-group-' + options.sourceId;
            }
            else if( options.sourceType === 'set' ) {
                flickrUrl = 'http://api.flickr.com/services/rest/?&method=flickr.photosets.getPhotos&api_key=' + options.apiKey + '&photoset_id=' + options.sourceId + '&per_page=' + options.limit + '&sort=' + options.sort+'&extras=url_t,url_m,url_o,url_s,url_q,url_l,url_z,description';
                cacheId = 'flickr-set-' + options.sourceId;
            }
            else if( options.sourceType === 'tags' ) {
                flickrUrl += '&tags=' + options.sourceId;
                cacheId = 'flickr-tags-' + options.sourceId;
            }
            else if( options.sourceType === 'text' ) {
                flickrUrl += '&text=' + options.sourceId;
                cacheId = 'flickr-text-' + options.sourceId;
            }

            // check the cache first
            if( self.options.enableCache ) {
                var cache = self.getCache(cacheId);
            }
            else {
                var cache = $.Deferred();
                cache.resolve();
            }

            cache.done(function(data){
                var $cacheData = $(data);
                if( data && $cacheData.find('novaGallery').attr('status') !== 'expired' ) {
                    novaGallery.init( $cacheData );  // initialize the gallery from cached data
                }
                else {  // cache expired, load fresh data
                    $.ajax({
                        url: flickrUrl,
                        dataType: 'xml',
                        global: false,
                        success: function(data) {
                            var $data = $(data),
                                xml = '<novagallery>',
                                $xml,
                                photosXML = '';

                            if( $data.find('rsp').attr('stat') === 'ok' && $data.find('photos').attr('total') !== '0' ) {
                                photosXML = self.createFlickrSetXML( $data.find('photo'), imageSize, thumbSize );
                                xml += photosXML + '</novagallery>';
                                $xml = $( $.parseXML(xml) );
                                novaGallery.options.enableCache && novaGallery.updateCache(xml, cacheId);  // update the cache file with the loaded data
                                novaGallery.init( $xml );
                            }
                            else if( $data.find('photos').attr('total') === '0' ) {
                                self.ngLog( 'Flickr: No photos found' );
                            }
                            else {
                                self.ngLog( 'Flickr: '+ $data.find('err').attr('msg') );
                            }
                        }
                    });
                }
            });

        },


        // load a Flickr collection that has multiple sets
        loadFlickrCollection: function(options) {
            var self = novaGallery,
                thumbSize = 'url_'+options.thumbSize,
                imageSize = 'url_'+options.imageSize,
                cacheId = 'flickr-collection' + options.sourceId + '-user-' + options.userId,
                collectionUrl = 'http://api.flickr.com/services/rest/?method=flickr.collections.getTree&api_key='+options.apiKey,
                setUrl = 'http://api.flickr.com/services/rest/?&method=flickr.photosets.getPhotos&api_key=' + options.apiKey + '&per_page=' + options.limit + '&sort=' + options.sort+'&extras=url_t,url_m,url_o,url_s,url_q,url_l,url_z,description';

            if( options.sourceId !== '' ) {
                collectionUrl += '&collection_id='+options.sourceId;
            }

            if( options.userId !== '' ) {
                collectionUrl += '&user_id='+options.userId;
            }

            // check the cache first
            if( self.options.enableCache ) {
                var cache = self.getCache(cacheId);
            }
            else {
                var cache = $.Deferred();
                cache.resolve();
            }
            cache.done(function(data) {
                var $cacheData = $(data);
                if( data && $cacheData.find('novaGallery').attr('status') !== 'expired' ) {
                    novaGallery.init( $cacheData );  // initialize the gallery from cached data
                }
                else {  // cache expired, load fresh data
                    $.ajax({
                        url: collectionUrl,
                        dataType: 'xml',
                        global: false,
                        success: function(setData) {
                            var $setData = $(setData),
                                getSets = [],
                                setXml = [];

                            if( $setData.find('rsp').attr('stat') === 'ok' ) {
                                $setData.find('set').each(function(){
                                    var setId = $(this).attr('id'),
                                        setTitle = $(this).attr('title'),
                                        request = $.ajax({
                                            url: setUrl + '&photoset_id='+setId,
                                            dataType: 'xml',
                                            success: function(data){
                                                var $data = $(data),
                                                    xml = '<gallery title="'+ setTitle +'">',
                                                    $xml,
                                                    photosXML = '';

                                                if( $data.find('rsp').attr('stat') === 'ok' ) {
                                                    photosXML = self.createFlickrSetXML( $data.find('photo'), imageSize, thumbSize );
                                                    xml += photosXML + '</gallery>';
                                                    setXml.push(xml);
                                                }
                                                else {
                                                    self.ngLog( 'Flickr: '+ $data.find('err').attr('msg') );
                                                }
                                            }
                                        });

                                    getSets.push(request);
                                });
                            }
                            else {
                                self.ngLog( 'Flickr: '+ $setData.find('err').attr('msg') );
                            }

                            $.when.apply($, getSets).done(function(){
                                var xml = '<novagallery>'+ setXml.join('') + '</novagallery>',
                                    $xml = $( $.parseXML(xml) );

                                novaGallery.options.enableCache && novaGallery.updateCache(xml, cacheId);  // update the cache file with the loaded data
                                novaGallery.init( $xml );
                            });
                        }
                    });
                }
            });

        },


        // generate xml code from Flickr api containing data for a particular set or a specific user/group/tag/text
        createFlickrSetXML: function($photos, imageSize, thumbSize) {
            var largePhoto, $photo, photos = '';

            $photos.each(function(){
                $photo = $(this);

                largePhoto = $photo.attr(imageSize) ? $photo.attr(imageSize) : $photo.attr('url_o');
                largePhoto = largePhoto ? largePhoto : $photo.attr('url_z');
                largePhoto = largePhoto ? largePhoto : $photo.attr('url_m');

                photos += '<file type="photo">';
                photos += '<thumbnail>' + $photo.attr(thumbSize) + '</thumbnail>';
                photos += '<source>' + largePhoto + '</source>';
                photos += '<title><![CDATA[' + $photo.attr('title') + ']]></title>';
                photos += '<description><![CDATA[' + $photo.find('description').text() + ']]></description>';
                photos += '</file>';
            });

            return photos;
        },


        // load data from Picasa
        loadPicasaData: function(options) {
            var self = novaGallery,
                thumbSize = '',
                imageSize = '',
                cacheId = '',
                picasaUrl = 'https://picasaweb.google.com/data/feed/api/';

            if( options.sourceType === 'search' ) {
                picasaUrl += 'all?q=' + options.search + '&callback=?';
                cacheId = 'picasa-search-' + options.search;
            }
            else if( options.sourceType === 'user' ) {
                picasaUrl += 'user/'+ options.username + '?&callback=?';
                cacheId = 'picasa-user-' + options.username;
            }
            else if( options.sourceType === 'album' ) {
                picasaUrl += 'user/'+ options.username + '/album/'+ options.album +'?&callback=?';
                cacheId = 'picasa-album-' + options.album + '-user-' + options.username;
            }
            else if( options.sourceType === 'collection' ) {
                picasaUrl += 'user/'+ options.username + '?&callback=?';
                cacheId = 'picasa-collection-user-' + options.username;
            }

            // check the cache first
            if( self.options.enableCache ) {
                var cache = self.getCache(cacheId);
            }
            else {
                var cache = $.Deferred();
                cache.resolve();
            }

            cache.done(function(data){
                var $cacheData = $(data);
                if( data && $cacheData.find('novaGallery').attr('status') !== 'expired' ) {
                    novaGallery.init( $cacheData );  // initialize the gallery from cached data
                }
                else {  // cache expired, load fresh data
                    $.ajax({
                        url: picasaUrl,
                        data: {
                            'kind': options.sourceType === 'collection' ? 'album' : 'photo',
                            'access': 'public',
                            'max-results': options.sourceType === 'collection' ? 100 : options.limit,
                            'thumbsize': options.thumbSize+'u',
                            'imgmax': options.imageSize+'u',
                            'fields': options.sourceType === 'collection' ? 'entry(title,gphoto:name,gphoto:numphotos)': 'entry(media:group(media:content,media:thumbnail,media:title,media:description))',
                            'alt': 'json',
                        },
                        dataType: 'json',
                        timeout: 5000,
                        global: false,
                        success: function(data) {
                            if( !data.feed.entry ) {
                                self.ngLog('Picasa request failed');
                                return;
                            }

                            var xml = '<novagallery>',
                                $xml,
                                photos = '',
                                getPhotos = [],
                                request;

                            if( options.sourceType === 'collection' ) {
                                $.each(data.feed.entry, function(){
                                    if( this.gphoto$numphotos.$t === 0 ) {
                                        return;
                                    }

                                    var album = this;
                                    request = $.ajax({
                                        url: 'https://picasaweb.google.com/data/feed/api/user/'+options.username+'/album/'+this.gphoto$name.$t+'?&callback=?',
                                        data: {
                                            'kind': 'photo',
                                            'access': 'public',
                                            'max-results': options.limit,
                                            'thumbsize': options.thumbSize+'u',
                                            'imgmax': options.imageSize+'u',
                                            'fields': 'entry(media:group(media:content,media:thumbnail,media:title,media:description))',
                                            'alt': 'json'
                                        },
                                        dataType: 'json',
                                        global: false,
                                        success: function(albumdata) {
                                            photos += '<gallery title="'+ album.title.$t + '">';

                                            $.each(albumdata.feed.entry, function(){
                                                photos += '<file type="photo">';
                                                photos += '<thumbnail>'+ this.media$group.media$thumbnail[0].url +'</thumbnail>';
                                                photos += '<source>'+ this.media$group.media$content[0].url +'</source>';
                                                photos += '<title><![CDATA['+ this.media$group.media$title.$t +']]></title>';
                                                photos += '<description><![CDATA['+ this.media$group.media$description.$t +']]></description>';
                                                photos += '</file>';
                                            });

                                            photos += '</gallery>';
                                        }
                                    });

                                    getPhotos.push(request);
                                });
                            }
                            else {
                                $.each(data.feed.entry, function(){
                                    photos += '<file type="photo">';
                                    photos += '<thumbnail>'+ this.media$group.media$thumbnail[0].url +'</thumbnail>';
                                    photos += '<source>'+ this.media$group.media$content[0].url +'</source>';
                                    photos += '<title><![CDATA['+ this.media$group.media$title.$t +']]></title>';
                                    photos += '<description><![CDATA['+ this.media$group.media$description.$t +']]></description>';
                                    photos += '</file>';
                                });
                            }

                            $.when.apply($, getPhotos).done(function(){
                                xml += photos + '</novagallery>';
                                $xml = $( $.parseXML(xml) );
                                novaGallery.options.enableCache && novaGallery.updateCache(xml, cacheId);  // update the cache file with the loaded data
                                novaGallery.init($xml);
                            });
                        },
                        complete: function(xhr, data) {
                            var msg = '';
                            if(xhr.status === 0) {
                                if( options.sourceType === 'user' ) {
                                    msg += 'user not found';
                                }
                                else if ( options.sourceType === 'album' ) {
                                    msg += 'user or album not found';
                                }

                                msg = 'Picasa request failed' + (msg ? ': '+msg : '.');

                                self.ngLog(msg);
                            }
                        }
                    });
                }
            });

        },


        // get the cached data for Flickr/Picasa
        getCache: function(cacheId) {
            var req = $.ajax({
                data: {cacheId: cacheId, interval: novaGallery.options.cacheInterval},
                url: novaGallery.options.cacheFolder+'/get-cache.php',
                dataType: 'xml',
                global: false
            });

            return req;
        },


        // update the cache file with the returned data from Flickr/Picasa API
        updateCache: function(xml, cacheId) {
            $.ajax({
                type: 'post',
                data: {config: xml, cacheId: cacheId},
                url: novaGallery.options.cacheFolder+'/update-cache.php',
                dataType: 'xml',
                global: false
            });
        },


        // create html to display the various gallery sets
        createGallerySets: function($xml) {
            var self = novaGallery,
                $galleries = $xml.find('gallery'),
                gallerynum = $galleries.length,
                setHtml = '',
                thumb;

            for( var i = 0; i < gallerynum; i++ ) {
                thumb = $galleries.eq(i).attr('thumbnail');
                !thumb && (thumb = $galleries.eq(i).find('thumbnail').eq(0).text());

                setHtml += '<li>';
                setHtml += '<figure>';
                setHtml += '<img src="'+ thumb +'">';
                setHtml += '<figcaption>';
                setHtml += '<span class="title">'+ $galleries.eq(i).attr('title') +'</span>';
                setHtml += '<span class="number">'+ $galleries.eq(i).children().length +'</span>';
                setHtml += '</figcaption>';
                setHtml += '</figure>';
                setHtml += '</li>';
            }

            self.$gallerySets.children('ul').html(setHtml);
        },


        // get data for a particular gallery and display it when multiple gallery sets are present
        getGallery: function() {
            var self = novaGallery,
                galleryIndex = self.$gallerySets.find('li').index( $(this).closest('li') );

            self.$novaGallery.height( self.$novaGallery.height() );
            self.fwMeElem = null;  // clear the fullwidth mode player reference (helps avoid Flash "pauseMedia" bug in Chrome)
            self.fwplayer = null;
            window.mejs.players = [];

            if( Modernizr.csstransitions && self.homescreenAnim === 'scale' ) {
                self.$novaGallery.css('overflow', 'hidden');
                self.$gallerySets.addClass('scale scaleDown').on('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function() {
                    self.$novaGallery.css('overflow', '');
                    self.$gallerySets.removeClass('scale scaleUp').hide().off('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd');
                    self.$galleryWrapper.addClass('loading').fadeIn(600, function() {
                        self.showGallery(galleryIndex);
                    });
                });

                self.$gallerySets.redraw().addClass('scaleUp').removeClass('scaleDown');
            }
            else if( self.homescreenAnim === 'slide' ) {
                self.$novaGallery.css('overflow', 'hidden');
                self.$gallerySets.addClass('slide').transition({top: -self.$novaGallery.height()}, 600, self.easing, function(){
                    self.$gallerySets.removeClass('slide').css({top: '', display: 'none'});
                    self.$novaGallery.css('overflow', '');
                    self.$galleryWrapper.addClass('loading').fadeIn(600, function() {
                        self.showGallery(galleryIndex);
                    });
                })
            }
            else {
                self.$gallerySets.fadeOut(600, function() {
                    self.$galleryWrapper.addClass('loading').fadeIn(600, function() {
                        self.showGallery(galleryIndex);
                    });
                });
            }
        },


        // build and display the gallery (show a particular gallery if there are multiple gallery sets)
        showGallery: function(galleryIndex) {
            var self = novaGallery,
                $xml = galleryIndex !== undefined ? self.config.find('gallery').eq(galleryIndex) : self.config;

            self.$thumbGrid.add(self.$fullGallery).addClass('hidden');
            self.createGallery($xml);
            self.fwmediaSpeed = 0;  // set the animation speed for fullwidth item transitions to zero at the beginning
            self.setFWItem.call( self.$fullGallery.find('li')[0] );
            self.fwmediaSpeed = 400;  // after the gallery item has been set for the fullwidth mode reset the animation speed
            self.$novaGallery.imagesLoaded(function(){
                self.setThumbGrid();  // create thumbnail grid
                self.$fwmedia.show();
                self.$novaGallery.parent().addClass('parentHideOverflow');  // hide the overflow of gallery parent to ensure scrollbar width is not taken into account
                self.setFullwidthSize();
                self.$novaGallery.parent().removeClass('parentHideOverflow');
                self.fwShowThumbs && self.showFullwidthThumbs.call( self.$fullGallery.find('a.showThumbs')[0] );
                self.$thumbGrid.add(self.$fullGallery).removeClass('hidden');
                self.$galleryWrapper.removeClass('loading');
                self.$novaGallery.css({background: 'none', height: 'auto'});

                // recalculate styles if ie9.js is included
                self.ie9js && IE7.recalc();

                if( self.startMode === 'fullwidth' ) {
                    self.$fullGallery.fadeIn(400);
                    self.$novaGallery.find('a[data-mode="fullwidth"]').addClass('active').siblings().removeClass('active');
                }
                else {
                    if( self.thumbAppearAnim === 'flipSeq' || self.thumbAppearAnim === 'slideSeq' || self.thumbAppearAnim === 'fadeSeq' ) {
                        self.$thumbGrid.find('ul').addClass('play '+self.thumbAppearAnim);

                        if( Modernizr.cssanimations ) {  // perform css based animation
                            self.$thumbGrid
                            .find('li').last().on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', function(){
                                $(this).parent().removeClass('play '+self.thumbAppearAnim).end().off('animationend webkitAnimationEnd oanimationend MSAnimationEnd');
                            });
                        }
                        else {
                            self.$thumbGrid.find('li.filtered').each(function(i){
                                $(this).delay(i*200).css({opacity: 0, marginTop: self.thumbAppearAnim === 'slideSeq' ? '-30px' : 0})
                                .animate({opacity: 1, marginTop: 0}, 800, 'linear');
                            });
                        }

                        self.$thumbGrid.show();
                    }
                    else if( self.thumbAppearAnim === 'slide' ) {
                        self.$thumbGrid.css({marginTop: '-30px', display: 'block', opacity: 0})
                        .animate({marginTop: 0, opacity: 1}, 600);
                    }
                    else {
                        self.$thumbGrid.fadeIn(600);
                    }
                    self.$novaGallery.find('a[data-mode="thumbnails"]').addClass('active').siblings().removeClass('active');
                }

                self.slideshow && self.FWSlideshow.call( self.$fullGallery.find('a.slideshow')[0] );
            });
        },



        // create the gallery html
        createGallery: function($xml){
            var self = novaGallery;
            self.$files = $xml.find('file');
            self.itemnum = self.$files.length;

            // randomize gallery items
            if( self.options.shuffleItems ) {
                self.$files = $( self.shuffle( self.$files.get() ) );
            }

            var $titles       = self.$files.children('title'),
                $descriptions = self.$files.children('description'),
                $category,
                categories,
                thumbGridHtml = '',
                FWHtml        = ''

            for( var i = 0; i < self.itemnum; i++ ) {
                $category = self.$files.eq(i).find('category');
                categories = '{"category": false}';

                if( $category.length !== 0 ) {
                    categories = '{';
                    $category.each(function(){
                        categories += '"' + $(this).text() + '"' + ': true,';
                    });
                    categories = categories.substr(0, categories.length - 1);   // removing the comma from the last item
                    categories += '}';
                }

                var $file = self.$files.eq(i),
                    type = $file.attr('type'),
                    source = $file.find('source'),
                    thumb = $file.find('thumbnail').text(),
                    link = self.$files.eq(i).find('link').text(),
                    linkClass = link ? ' linkItem' : '',
                    linkHtml = '';


                if( type === 'video' ) {
                    if( self.options.useYoutubeThumbs && source.text().indexOf('youtube') !== -1 ) {
                        var vId = source.text().split('v=')[1];
                        thumb = 'http://img.youtube.com/vi/'+ vId +'/mqdefault.jpg';
                    }
                }

                if( link ) {
                    if( self.options.newWindowLinks ) {
                        linkHtml = '<a class="link" href="'+link+'" target="_blank"></a>';
                    }
                    else {
                        linkHtml = '<a class="link" href="'+link+'"></a>';
                    }
                }

                // create the html for the Thumbnails grid
                thumbGridHtml += '<li class="filtered'+linkClass+'" data-id="'+i+'" data-type="'+ type + '" data-categories=\''+ categories +'\'>';
                thumbGridHtml += '<figure>';
                thumbGridHtml += '<img src="'+thumb+'" alt="" />';
                thumbGridHtml += '<figcaption>';
                thumbGridHtml += '<h2>'+$titles.eq(i).text()+'</h2>';
                thumbGridHtml += '<div class="details">'+$descriptions.eq(i).text()+'</div>';
                thumbGridHtml += '</figcaption>';
                thumbGridHtml += '</figure>';
                thumbGridHtml += '<div class="hoverTitle">'+$titles.eq(i).text()+'</div>';
                thumbGridHtml += '<a class="showInfo"></a>';
                thumbGridHtml += '<a class="showOverlay"></a>';
                thumbGridHtml += linkHtml;

                // create the html for Fullwidth mode
                FWHtml += '<li class="filtered" data-id="'+i+'" data-type="'+ type +'" data-categories=\''+ categories +'\'>';
                FWHtml += '<img src="'+thumb+'" alt="" />';
                FWHtml += '</li>';
            }


            self.$thumbGrid.find('ul').html(thumbGridHtml);
            self.$fullGallery.find('ul').html(FWHtml);

            if( self.fwResize ) {
                self.$fullGallery.find('a.resize').addClass('collapsed');
            }
        },


        // function to setup the thumbnail grid with masonry layout
        setThumbGrid: function() {
            var self = this,
                $list = self.$thumbGrid.children('ul'),
                $images = self.$thumbGrid.find('figure > img'),
                imagenum = $images.length,
                iw = 0,
                ih = 0,
                width;

            // first adjust the dimensions of the images based on the smallest image width (which is taken to be the column width)
            for( var i = 0; i < imagenum; i++ ) {
                i === 0  && (iw = $images[i].width);
                $images[i].width < iw && (iw = $images[i].width);
            }

            for( var i = 0; i < imagenum; i++ ) {
                width = iw*Math.floor($images[i].width/iw);
                $images[i].width = width;
                $images.eq(i).parent().add( $images.eq(i).closest('li') ).css({ width: width, height: $images[i].height });
            }

            if( $list.hasClass('masonry') ) {
                $list.masonry('destroy');
            }

            var $item = $list.children('li').eq(0),
                columnWidth = iw + parseInt($item.css('marginRight'), 10) + parseInt($item.css('marginLeft'), 10);

            self.filterSpeed = 0;
            self.$thumbGrid.addClass('setCategory');
            $list.masonry({
                isAnimated: !Modernizr.csstransitions,
                animationOptions: {
                    duration: 600,
                    easing: 'swing',
                    queue: false
                },
                isFitWidth: true,
                columnWidth: columnWidth,
                itemSelector: '.filtered'
            });

            $list.masonry('option', 'duration', self.filterSpeed);
            self.handleMenu.call( $('#filterButtons').find('a.startCategory')[0] );  // show the starting category
            self.$thumbGrid.removeClass('setCategory');
            self.filterSpeed = 600;
            $list.masonry('option', 'duration', self.filterSpeed);

            if( Modernizr.cssanimations ) {
                $list.find('li.filtered').each(function(i){
                    $(this).css({'-webkit-animation-delay': i * 200 + 'ms',
                                '-moz-animation-delay': i * 200 + 'ms',
                                '-o-animation-delay': i * 200 + 'ms',
                                '-ms-animation-delay': i * 200 + 'ms',
                                'animation-delay': i * 200 + 'ms'
                            });
                });
            }
        },


        // shuffle the gallery items
        shuffle: function(items) {
            for(var j, x, i = items.length; i; j = parseInt(Math.random() * i, 10), x = items[--i], items[i] = items[j], items[j] = x);

            return items;
        },


        bindEvents: function() {
            // process click events on the gallery menu
            this.$novaGallery.find('menu').on('click', 'a', this.handleMenu);

            // add hover class on menu for touch screens
            this.$novaGallery.find('menu').on('touchstart', function(e){
                e.stopPropagation();
                $(this).addClass('hover');
            });

            // show/hide filter menu in touch devices using taps
            this.$filterButtons.on('touchstart', function(e){
                e.stopPropagation();
                novaGallery.$filterButtons.addClass('hover');
            });

            // hide the filter menu when tapping somewhere else
            $(document).on('touchstart', function(e){
                novaGallery.$filterButtons.removeClass('hover').closest('menu').removeClass('hover');
            });

            // show a particular gallery
            this.$gallerySets.on('click', 'img', this.getGallery);

            // add hover class on gallery items (to be used in touch screens)
            this.$thumbGrid.on('touchstart', 'li', function(){
                $(this).addClass('hover').siblings().removeClass('hover');
            });

            // bind the click event to show/hide thumbnails grid captions
            this.$thumbGrid.on('click', 'a.showInfo', this.thumbGridCaptions);

            // open overlay
            this.$thumbGrid.on('click', 'a.showOverlay', this.overlayCreate);

            // show prev item in overlay
            this.$prevItem.click(this.overlayPrev);

            // show next item in overlay
            this.$nextItem.click(this.overlayNext);

            // close overlay
            this.$close.click(this.overlayClose);

            // set fullscreeen gallery size when window resizes
            this.$window.on('resize orientationchange mozfullscreenchange webkitfullscreenchange', this.setFullwidthSize);

            // show/hide the thumbnails in the Fullwidth mode when the button is clicked
            this.$fullGallery.find('a.showThumbs').click(this.showFullwidthThumbs);

            // display items when thumbnails are clicked in Fullwidth mode and show the first item when the page loads
            this.$fullGallery.on('click', 'li', this.setFWItem);

            // show the next slide of thumbnails in fullwidth mode
            this.$fullGallery.find('a.slide-next').click( this.thumbnailsSlideNext );

            // show the previous slide of thumnbails in fullwidth mode
            this.$fullGallery.find('a.slide-prev').click( this.thumbnailsSlidePrev );

            this.$fullGallery.find('ul').on('touchstart touchmove touchend', this.touchSlide);

            // start/stop slideshow in fullwidth mode
            this.$fullGallery.find('a.slideshow').click( this.FWSlideshow );

            // show the next item in fullwidth mode
            this.$fullGallery.find('a.next').click( this.showNextFWItem );

            // show the previous item in fullwidth mode
            this.$fullGallery.find('a.prev').click( this.showPrevFWItem );

            // show the item caption in fullwidth mode
            this.$fullGallery.find('a.info').click( this.showFWCaption );

            // close the caption for fullwidth mode
            this.$fwOverlay.find('a.close').click( this.closeFWCaption )

            // resize the item fullwidth mode
            this.$fullGallery.find('a.resize').click( this.resizeFWItem );

            // check when the fullwidth button is clicked in the media player
            if( this.html5FS ) {
                $(document).on('click', 'div.mejs-fullscreen-button', this.nativeMEFS);
            }

            if( this.isOpera ) {
                this.$fwmedia.on('click', 'div.mejs-fullscreen-button', this.operaMEFS);
                $(document).keydown( this.operaEscPlayerFS );
            }

            // attach keyboard events
            $(document).keydown( this.handleKeys );

            // if the browser supports page-visibilty api then attach the visibilitychange event
            var pageVisProp = this.getHiddenProp();
            if( pageVisProp ) {
                var evtname = pageVisProp.replace(/[H|h]idden/,'') + 'visibilitychange';
                document.addEventListener(evtname, this.pageVisChange);
            }
        },


        // function to show/hide thumbnail grid captions
        thumbGridCaptions: function() {
            var self              = novaGallery,
                $showInfo         = $(this),
                $li               = $showInfo.parent(),
                $figure           = $li.children('figure'),
                $caption          = $li.find('figcaption'),
                $img              = $li.find('img'),
                $hoverTitle       = $li.children('div.hoverTitle'),
                showInfoPos       = 0,
                $container        = self.displayType === 'container' ? self.$novaGallery.parent() : self.$window,
                iw                = $img[0].width,
                ih                = $img[0].height,
                cw                = iw,
                ch                = ih,
                delay             = 600,
                expansionDuration = 600;

            // find dimensions of caption by using dummy caption container
            self.$captionTest.empty().html( $caption.html() );
            cw = parseInt(self.$captionTest.css('width'), 10);
            ch = parseInt(self.$captionTest.css('height'), 10);

            cw < iw && ( cw = iw );
            ch < ih && ( ch = ih );
            showInfoPos = cw > iw ? (iw - cw) : showInfoPos;
            expansionDuration = cw === iw && ch === ih ? 0 : expansionDuration;  // set delay accordingly
            $li.data('expansionDuration', expansionDuration);

            // close previously opened captions
            self.closeThumbCaption( $li.siblings('li.captionOn') );


            // now either show the caption of current item
            if( !$li.hasClass('captionOn') ) {
                $li.addClass('captionOn');

                if( $li.offset().left + cw > $container.width() ) {
                    $figure.add($caption).removeClass('fixedLeft').addClass('fixedRight');
                    showInfoPos = 0;
                }
                else {
                    $figure.add($caption).removeClass('fixedRight').addClass('fixedLeft');
                }

                $showInfo.addClass('hidden').css('right', showInfoPos);
                $hoverTitle.addClass('hidden');

                if( self.thumbCaptionAnim === 'flip' ) {
                    $li.addClass('flip');
                    setTimeout(function(){
                        $figure.addClass('hideOverflow');
                        $figure.add($caption).css({ width: cw, height: ch });

                        setTimeout(function(){
                            $showInfo.removeClass('hidden');
                            $caption.css('overflow', 'auto');
                        }, expansionDuration);
                    }, delay);
                }
                else {
                    $figure.addClass('hideOverflow');
                    $img.fadeOut(600);
                    $caption.css({width: cw, height: ch}).fadeIn(600);
                    $figure.transition({ width: cw, height: ch }, expansionDuration, self.easing);
                    $showInfo.removeClass('hidden');
                    $caption.css('overflow', 'auto');
                }
            }
            else {  // or close it
                self.closeThumbCaption($li);
            }
        },


        // close the caption of a thumbnail grid item
        closeThumbCaption: function($thumbItem) {
            if( $thumbItem.length === 0 ) {
                return false;
            }

            var $figure           = $thumbItem.children('figure'),
                $caption          = $figure.children('figcaption'),
                $img              = $thumbItem.find('img'),
                $showInfo         = $thumbItem.children('a.showInfo'),
                $hoverTitle       = $thumbItem.children('div.hoverTitle'),
                expansionDuration = $thumbItem.data('expansionDuration');

            $showInfo.addClass('hidden').css('right', '0');
            $caption.css('overflow', '');

            if( novaGallery.thumbCaptionAnim === 'flip' ) {
                $figure.css({ width: $img[0].width, height: $img[0].height });
                setTimeout(function(){
                    $figure.removeClass('hideOverflow');
                    $figure.children('figcaption').css({ width: $img[0].width, height: $img[0].height });
                    $thumbItem.redraw().removeClass('captionOn flip');
                    setTimeout(function(){ $showInfo.add($hoverTitle).removeClass('hidden'); }, 600);
                }, expansionDuration);
            }
            else {
                $figure.transition({ width: $img[0].width, height: $img[0].height }, expansionDuration, self.easing);
                $figure.children('figcaption').fadeOut(600);
                $img.fadeIn(600, function(){
                    $thumbItem.removeClass('captionOn');
                    $showInfo.add($hoverTitle).removeClass('hidden');
                });
            }

        },


        // filter items
        handleMenu: function () {
            var self        = novaGallery,
                $this       = $(this),
                sections    = self.$galleryWrapper.children('div.displayStyle'),
                $thumbItems = self.$thumbGrid.find('li'),
                $fwItems    = self.$fullGallery.find('li'),
                mode        = $this.data('mode'),
                type        = $this.data('type'),
                category    = $this.data('category');


            if( this.id === 'gotoSets' ) {  // go back to home screen where gallery sets are displayed
                $this.removeClass('active');

                // stop any audio video playing in fullwidth mode
                self.fwMeElem && self.fwMeElem.pause();

                if( Modernizr.csstransitions && self.homescreenAnim === 'scale' ) {
                    self.$novaGallery.css({height: self.$novaGallery.height(), overflow: 'hidden'});
                    self.$galleryWrapper.addClass('scale scaleUp');
                    self.$gallerySets.addClass('scale scaleUp').show();
                    self.$galleryWrapper.add(self.$gallerySets).redraw().removeClass('scaleUp').addClass('scaleDown');

                    self.$gallerySets.on('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function() {
                        self.$galleryWrapper.hide().add(self.$gallerySets).removeClass('scale scaleDown');
                        self.$novaGallery.css({ height: 'auto', overflow: ''});
                        sections.hide();
                        self.$novaGallery.find('menu a').removeClass('active');
                        self.$gallerySets.off('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd');
                    });
                }
                else if( self.homescreenAnim === 'slide' ) {
                    self.$novaGallery.css({height: self.$novaGallery.height(), overflow: 'hidden'});
                    self.$gallerySets.addClass('slide').css({display: 'block', top: -self.$novaGallery.height()});
                    self.$galleryWrapper.fadeOut(600, function(){
                        self.$gallerySets.transition({top: 0}, 600, self.easing, function(){
                            self.$gallerySets.removeClass('slide');
                            self.$novaGallery.css({ height: 'auto', overflow: ''});
                        });
                        sections.hide();
                        self.$novaGallery.find('menu a').removeClass('active');
                    });
                }
                else {
                    self.$galleryWrapper.fadeOut(600, function() {
                        self.$gallerySets.fadeIn(600);
                        sections.hide();
                        self.$novaGallery.find('menu a').removeClass('active');
                    });
                }
            }
            else if( this.id === 'goFullscreen' ) {   // make the gallery fullscreen (or exit from it) using HTML5 Fullscreen Api
                if( (document.fullScreenElement && document.fullScreenElement !== null) ||    // alternative standard method
                  (!document.mozFullScreenElement && !document.webkitIsFullScreen) ) {  // current working methods
                    if( self.$novaGallery[0].requestFullScreen ) {
                        self.$novaGallery[0].requestFullScreen();
                    }
                    else if( self.$novaGallery[0].mozRequestFullScreen ) {
                        self.$novaGallery[0].mozRequestFullScreen();
                    }
                    else if( self.$novaGallery[0].webkitRequestFullScreen ) {
                        self.$novaGallery[0].webkitRequestFullScreen();
                    }
                }
                else {
                    if( document.cancelFullScreen ) {
                        document.cancelFullScreen();
                    }
                    else if( document.mozCancelFullScreen ) {
                        document.mozCancelFullScreen();
                    }
                    else if( document.webkitCancelFullScreen ) {
                        document.webkitCancelFullScreen();
                    }
                }
            }
            else if( $this.closest('#filterButtons').length !== 0 ) {   //code to filter the items
                if( $this.hasClass('top') ) {
                    return;
                }

                var $thumbFilteredItems, $fwFilteredItems;
                $this.closest('ul').find('a').removeClass('active');
                $this.addClass('active');

                // sort by file type, i.e photo, audio or video
                if( type ) {
                    if( type === 'all' ) {
                        $thumbFilteredItems = $thumbItems;
                        $fwFilteredItems = $fwItems;
                    }
                    else {
                        $thumbFilteredItems = $thumbItems.filter('[data-type='+ type +']');
                        $fwFilteredItems = $fwItems.filter('[data-type='+ type +']');
                    }
                }
                // sort by custom categories
                else if( category ) {
                    $thumbFilteredItems = $thumbItems.filter(function(){
                        if( category in $(this).data('categories') ){
                            return true;
                        }
                    });

                    $fwFilteredItems = $fwItems.filter(function(){
                        if( category in $(this).data('categories') ) {
                            return true;
                        }
                    });
                }

                self.$thumbGrid.css('overflow', 'hidden');
                $thumbItems.not($thumbFilteredItems).redraw().removeClass('filtered');
                $thumbFilteredItems.addClass('filtered');

                self.$thumbGrid.children('ul').masonry('reload');
                if( !Modernizr.csstransitions ) {
                    $thumbItems.not($thumbFilteredItems).animate({opacity: 0}, self.filterSpeed, function(){
                        $(this).hide();
                        self.$thumbGrid.css('overflow', '');
                    });

                    $thumbFilteredItems.show().animate({opacity: 1}, self.filterSpeed);
                }
                else {
                    self.$thumbGrid.on('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function() {
                        self.$thumbGrid.css('overflow', '').off('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd');
                    });
                }


                self.$fullGallery.find('ul').fadeOut(self.filterSpeed, function(){
                    $fwItems.filter('li.filtered').eq(0).css('margin-left', '0');
                    $fwItems.removeClass('filtered').hide();
                    $fwFilteredItems.addClass('filtered').show();
                    $(this).fadeIn(self.filterSpeed);
                    if( !self.$fwActiveItem.hasClass('filtered') ) {
                        $fwFilteredItems.eq(0).trigger('click');
                    }
                    else {
                        var itemnum = $fwFilteredItems.length,
                            itemindex = $fwFilteredItems.index(self.$fwActiveItem);
                        self.$fullGallery.find('p.slide-number').text( (itemindex+1) + '/'+ itemnum );
                        self.fwIndex = itemindex;
                    }
                    self.setThumbnailsSlider();
                });

            }
            else {   //code to display the items as thumbnails or in fullwidth mode
                var targetSection = sections.filter('[data-display="'+mode+'"]');
                $this.addClass('active').siblings().removeClass('active');

                if( targetSection.is(':hidden') ) {
                    if( mode === 'fullwidth' ) {
                        self.$fullGallery.addClass('hidden');
                        self.$novaGallery.parent().addClass('parentHideOverflow');
                        self.setFullwidthSize();
                        self.$novaGallery.parent().removeClass('parentHideOverflow');
                        self.$fullGallery.removeClass('hidden');
                    }
                    else {
                        self.fwMeElem && self.fwMeElem.pause();
                    }

                    sections.filter(':visible').fadeOut(600, function(){
                        targetSection.fadeIn(600, function() {
                            if( mode === 'fullwidth' && self.$fwmedia.data('type') !== 'photo' ) {
                                if( self.fwMeElem.pluginType !== 'youtube' && self.fwMeElem.pluginType !== 'vimeo' ) {
                                    self.fwplayer.setControlsSize();
                                }
                            }
                        });
                    });

                }
            }
        },


        // function to create overlay content for thumbnail gallery
        overlayCreate: function () {
            var self      = novaGallery,
                $item     = $(this).parent(),
                type      = $item.data('type'),
                fileindex = $item.data('id'),
                itemindex = self.$thumbGrid.find('li.filtered').index($item),
                $file     = self.$files.eq(fileindex),
                sources   = $file.find('source');

            self.thumbIndex = itemindex;

            self.$otitle[0].innerHTML = $file.find('title').text();
            self.$odescription[0].innerHTML = $file.find('description').text();

            var top = self.$window.height()/2;

            self.$mask.css({ height: $(document).height(), width: $(document).width() }).fadeIn(400, function(){
                self.$overlayLoader.css( 'top', top ).show();

                if( type === 'photo' ) {
                    //IE fix to force load image
                    if( self.msie ) {
                        self.$overlay.css({ visibility: 'hidden', display: 'block' });
                        self.$overlayContent.css({ visibility: 'hidden', display: 'block' });
                    }

                    var $image = $('<img src="'+ sources.text() +'" alt="" />').appendTo(self.$overlayContent);
                    $image[0].onload = function(){
                        self.resizeImage( $image[0], 'thumbnails' );

                        var iw = $image[0].width, ih = $image[0].height;

                        iw = iw < 300 ? 300 : iw;  // don't let the overlay shrink to less than 300px wide.

                        if( self.msie ) {
                            self.$overlay.css({ visibility: 'visible', display: 'none' });
                            self.$overlayContent.css({ visibility: 'visible', display: 'none' });
                        }

                        self.overlayShow(iw, ih, top);
                    };
                }
                else if( type === 'audio') {
                    var audio = '<audio controls>',
                        safariAudio = '<audio controls';

                    for( var i = 0, len = sources.length; i < len; i++ ) {
                        var filePath = sources.eq(i).text(),
                            fileExt = filePath.split('.').pop();

                        if( fileExt === 'ogg' ) {
                            audio += '<source type="audio/ogg" src="'+ filePath +'" />';
                        }
                        else if( fileExt === 'mp3' ) {
                            audio += '<source type="audio/mpeg" src="'+ filePath +'" />';
                            safariAudio += 'type="audio/mpeg" src="'+ filePath +'"></audio>';
                        }
                    }

                    audio += '</audio>';

                    if( self.isSafari) {  // Safari (Windows) without Quicktime installed removes <source> tags. This is the fix
                        self.$overlayContent.append(safariAudio);
                    }
                    else {
                        self.$overlayContent.append(innerShiv(audio));
                    }

                    if( self.$window.width() <= 480 ) {
                        self.overlayShow( self.$window.width() - 80, 30, top);
                    }
                    else {
                        self.overlayShow( 400, 30, top);
                    }

                }
                else if( type === 'video') {
                    var videoWidth = 600, videoHeight = 338;

                    if( self.$window.width() <= 680 ) {
                        videoWidth = self.$window.width() - 80;
                        videoHeight = videoWidth*(338/600);
                    }


                    if( sources.eq(0).text().indexOf('youtube') !== -1 ) {
                        var vId = sources.eq(0).text().split('v=')[1],
                            ytAutoplay = self.autoplay ? '&autoplay=1' : '',
                            video = '<iframe width="'+ videoWidth +'" height="'+ videoHeight +'" src="http://www.youtube.com/embed/'+ vId +'?hd=1&rel=0&enablejsapi=1'+ ytAutoplay +'" frameborder="0" allowfullscreen></iframe>',
                            iframe = self.$overlayContent.append(video).find('iframe');

                        self.thumbMeElem = {
                            pluginType: 'youtube',
                            pause: function(){
                                iframe[0].contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                            }
                        };
                    }
                    else if( sources.eq(0).text().indexOf('vimeo') !== -1) {
                        var vId = sources.eq(0).text().split('/').pop(),
                            vAutoplay = self.autoplay ? '&autoplay=1' : '',
                            url = 'http://player.vimeo.com/video/'+ vId,
                            video = '<iframe src="'+ url +'?api=1'+ vAutoplay +'" width="'+ videoWidth +'" height="'+ videoHeight +'" frameborder="0" webkitAllowFullScreen allowFullScreen></iframe>',
                            iframe = self.$overlayContent.append(video).find('iframe');

                        self.thumbMeElem = {
                            pluginType: 'vimeo',
                            pause: function(){
                                iframe[0].contentWindow.postMessage('{"method":"pause"}', url);
                            }
                        };
                    }
                    else {
                        var video = '<video controls width="'+ videoWidth +'" height="'+ videoHeight +'">',
                            safariVideo = '<video controls width="'+ videoWidth +'" height="'+ videoHeight +'"';

                        for( var i = 0, len = sources.length; i < len; i++ ) {
                            var filePath = sources.eq(i).text(),
                            fileExt = filePath.split('.').pop();

                            if( fileExt === 'mp4' ) {
                                video += '<source type="video/mp4" src="'+ filePath +'" />';
                                safariVideo += 'type="video/mp4" src="'+ filePath +'"></video>';
                            }
                            else if( fileExt === 'webm' ) {
                                video += '<source type="video/webm" src="'+ filePath +'" />';
                            }
                            else if( fileExt === 'ogv' ) {
                                video += '<source type="video/ogg" src="'+ filePath +'" />';
                            }
                        }

                        video += '</video>';

                        if(self.isSafari) {  // Same Safari fix
                            self.$overlayContent.append(safariVideo);
                        }
                        else {
                            self.$overlayContent.append(innerShiv(video));
                        }
                    }

                    self.overlayShow( videoWidth, videoHeight, top);
                }
            });
        },


        // function to show overlay
        overlayShow: function (ow, oh, top) {
            var self    = novaGallery,
                itemnum = self.$thumbGrid.find('li.filtered').length;

            self.$overlay.css({ display: 'block', visibility: 'hidden', width: ow });
            self.$overlayContent.show();

            var captionHeight = self.$overlay.find('div.details').height() + 20,
                marginTop     = -(oh + captionHeight + 40)/2,
                marginLeft    = -(ow + 40)/2;

            self.$overlayContent.hide();

            if( self.thumbIndex === 0 ) {
                self.$prevItem.hide();
                self.$nextItem.show();
            }
            else if( self.thumbIndex === itemnum - 1 ) {
                self.$prevItem.show();
                self.$nextItem.hide();
            }
            else {
                self.$prevItem.show();
                self.$nextItem.show();
            }

            self.$overlayLoader.hide();
            self.$overlay.css({ display: 'none', visibility: 'visible', width: ow, height: oh+captionHeight, top: top, marginTop: marginTop, marginLeft: marginLeft }).slideDown(600, function(){
                self.$overlayContent.fadeIn(400).find('audio,video').mediaelementplayer({
                    audioWidth: ow,
                    videoWidth: ow,
                    videoHeight: oh,
                    hideVolumeOnTouchDevices: false,
                    startVolume: self.storeVolume && self.volume ? self.volume : 1.0,
                    loop: self.loop,
                    pauseOtherPlayers: false,
                    mode: self.isChrome ? 'shim' : 'auto',
                    success: function(mediaElement, domObject, player) {
                        self.thumbMeElem = mediaElement;
                        self.thumbPlayer = player;

                        // unbind click event from player fullscreen button if browser supports HTML5 Fullscreen API
                        self.html5FS && player.media.pluginType === 'native' && player.container.find('div.mejs-fullscreen-button').off('click');

                        if( self.ie9js ) {   //reapply css styles when using IE9.js
                            IE7.recalc();
                        }

                        if( self.autoplay ) {  // if autoplay option is chosen
                            mediaElement.play();
                        }
                    }
                });
            });
        },


        // navigate through items by clicking on next/prev buttons in the overlay
        overlayPrev: function(){
            var self = novaGallery;

            if( self.thumbIndex - 1 < 0 ) {
                return;
            }

            if( self.thumbPlayer ) {
                self.thumbPlayer.remove();
            }

            self.$overlayContent.hide().children().not('div.details').remove();
            self.$overlay.hide();
            if( self.thumbMeElem ) {
                // self.thumbMeElem.pause();
                self.thumbMeElem = null;
                self.thumbPlayer = null;
                window.mejs.players = [];
            }

            self.$thumbGrid.find('li.filtered').eq(self.thumbIndex-1).children('a.showOverlay').trigger('click');

        },


        overlayNext: function(){
            var self = novaGallery;

            if( self.thumbIndex + 1 === self.itemnum ) {
                return;
            }

            if( self.thumbPlayer ) {
                self.thumbPlayer.remove();
            }

            self.$overlayContent.hide().children().not('div.details').remove();
            self.$overlay.hide();
            if( self.thumbMeElem ) {
                // self.thumbMeElem.pause();
                self.thumbMeElem = null;
                self.thumbPlayer = null;
                window.mejs.players = [];
            }

            self.$thumbGrid.find('li.filtered').eq(self.thumbIndex+1).children('a.showOverlay').trigger('click');
        },


        // code to close overlay
        overlayClose: function(){
            var self = novaGallery;

            self.$overlayContent.fadeOut(400, function(){
                self.$overlay.slideUp(600, function(){
                    if( self.thumbPlayer ) {
                        self.thumbPlayer.remove();
                    }
                    self.$overlayContent.children().not('div.details').remove();
                    self.$mask.fadeOut(400);

                    if( self.thumbMeElem ) {
                        self.volume = self.thumbMeElem.volume;

                        if( self.msie ) {
                            // self.thumbMeElem.pause();
                            self.thumbMeElem = null;
                            self.thumbPlayer = null;
                            window.mejs.players = [];
                        }
                    }
                });
            });
        },


        // function to resize images if they are larger than browser window
        resizeImage: function(img, mode) {
            if( !img ) {
                return;
            }

            var self = novaGallery,
                maxw = mode === 'thumbnails' ? self.$window.width() - 120 : self.$fwmedia.width() - 40,
                maxh = mode === 'thumbnails' ? self.$window.height() - 270 : self.$fwmedia.height() - 40,
                maxr = maxw/maxh,
                imgr = img.width/img.height,
                iw   = img.width,
                ih   = img.height;

            if( mode === 'fullwidth' ) {
                var $img = $(img);
                $img.addClass('getSize');

                if( self.msie ) {
                    iw = $img.width();
                    ih = $img.height();
                    imgr = iw/ih;
                }
            }

            if( mode === 'thumbnails') {
                maxw = maxw < 0 ? self.$window.width() - 40 : maxw;  // just consider the overlay padding of 20px

                if( maxh < 50 ) {
                    self.$overlay.css({ display: 'block', visibility: 'hidden' });
                    self.$overlayContent.show();
                    maxh = self.$window.height() - 100 - self.$overlay.find('div.details').height();
                    self.$overlayContent.hide();
                    self.$overlay.css({ display: 'none', visibility: 'visible' });
                }
            }

            if( mode === 'fullwidth' && self.$fwmedia.data('type') === 'audio' ) {
                maxh = self.$fwmedia.height() -  70;
            }

            if( iw > maxw || ih > maxh ) {
                if( imgr === maxr ) {
                    iw = maxw;
                    ih = maxh;
                }
                else {
                    iw = maxh*imgr;
                    ih = maxh;

                    if(iw > maxw) {
                        iw = maxw;
                        ih = maxw/imgr;
                    }
                }
            }

            img.width = iw;
            img.height = ih;

            if( mode === 'fullwidth' ) {
                if( self.$fwmedia.data('type') === 'audio' ) {
                    $img.removeClass('getSize').css({ left: (self.$fwmedia.width() - iw)/2, top: (self.$fwmedia.height() - 30 - ih)/2 });  // compensate for audio player height
                }
                else {
                    $img.removeClass('getSize').css({ left: (self.$fwmedia.width() - iw)/2, top: (self.$fwmedia.height() - ih)/2 });
                }
            }
        },


        // function to display the appropriate gallery item in the Fullwidth mode
        setFWItem: function(e) {
            // stop the slideshow if the user manually clicked
            if(e && e.originalEvent && novaGallery.fwClock) {
                novaGallery.resetSlideshow();
            }

            var self           = novaGallery,
                $item          = $(this),
                $filteredItems = self.$fullGallery.find('li.filtered'),
                itemnum        = $filteredItems.length,
                itemindex      = $filteredItems.index(this),
                fileindex      = $item.data('id'),
                type           = $item.data('type'),
                $file          = self.$files.eq(fileindex),
                sources        = $file.find('source'),
                $bottomBar     = self.$fullGallery.find('div.bottom-bar'),
                img            = null,
                postImgLoad;

            self.fwIndex = itemindex;
            self.$fwActiveItem = $item;
            $item.addClass('active').siblings().removeClass('active');
            self.fwMeElem && (self.volume = self.fwMeElem.volume) && self.fwMeElem.pause();

            if( itemindex === 0 ) {
                self.$fullGallery.find('a.prev').addClass('disabled');
                self.$fullGallery.find('a.next').removeClass('disabled');
            }
            else if( itemindex === itemnum - 1 ) {
                self.$fullGallery.find('a.prev').removeClass('disabled');
                self.$fullGallery.find('a.next').addClass('disabled');
            }
            else {
                self.$fullGallery.find('a.prev').removeClass('disabled');
                self.$fullGallery.find('a.next').removeClass('disabled');
            }

            $bottomBar.find('p.slide-number').text( (itemindex+1) + '/'+ itemnum );
            $bottomBar.find('p.title').html( $file.find('title').text() );

            if( self.$fwOverlay.is(':visible') ) {
                self.closeFWCaption();
            }


            self.$fwmedia.data('type', type);
            self.$fullGallery.find('p.title').attr('data-type', type);

            var showNewItem = function(){
                self.$fwmedia.empty();
                window.mejs.players = [];
                self.fwMeElem = null;
                self.fwplayer = null;

                if( type === 'photo' ) {
                    img = new Image;
                    img.src = sources.text();
                    self.$fwmedia.append(img);

                    postImgLoad = function(){
                        if( self.$fullGallery.find('a.resize').hasClass('collapsed') ) {
                            self.resizeImage( self.$fwmedia.find('img')[0], 'fullwidth' );
                        }
                        else {
                            self.setFullMediaSize();
                        }

                        self.showFWMedia();
                    };
                }
                else if( type ===  'audio' ) {
                    img = new Image;
                    img.src = $file.find('poster').text();
                    self.$fwmedia.append(img);

                    postImgLoad = function() {
                        if( self.$fullGallery.find('a.resize').hasClass('collapsed') ) {
                            self.resizeImage( self.$fwmedia.find('img')[0], 'fullwidth' );
                        }
                        else {
                            self.setFullMediaSize();
                        }

                        self.showFWMedia();
                    };

                    var audio = '<audio controls width="100%">',
                        safariAudio = '<audio controls width="100%"';

                    for( var i = 0, len = sources.length; i < len; i++ ) {
                        var filePath = sources.eq(i).text(),
                            fileExt = filePath.split('.').pop();

                        if( fileExt === 'ogg' ) {
                            audio += '<source type="audio/ogg" src="'+ filePath +'" />';
                        }
                        else if( fileExt === 'mp3' ) {
                            audio += '<source type="audio/mpeg" src="'+ filePath +'" />';
                            safariAudio += 'type="audio/mpeg" src="'+ filePath +'"></audio>';
                        }
                    }

                    audio += '</audio>';

                    self.isSafari ? self.$fwmedia.append(safariAudio) : self.$fwmedia.append(audio);
                    self.setFWPlayer();
                }
                else if( type === 'video' ) {
                    if( sources.eq(0).text().indexOf('youtube') !== -1 ) {
                        var vId = sources.eq(0).text().split('v=')[1],
                            ytAutoplay = self.autoplay ? '&autoplay=0' : '',
                            video = '<iframe width="640" height="360" src="http://www.youtube.com/embed/'+ vId +'?hd=1&rel=0&enablejsapi=1&wmode=transparent'+ ytAutoplay +'" frameborder="0" allowfullscreen></iframe>',
                            iframe = self.$fwmedia.append(video).find('iframe');

                        self.fwMeElem = {
                            pluginType: 'youtube',
                            pause: function(){
                                iframe[0].contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                            }
                        };

                        self.fwplayer = {container: iframe};
                        self.showFWMedia();
                        if( self.$fullGallery.find('a.resize').hasClass('collapsed') ) {
                            self.shrinkVideo();
                        }
                        else {
                            self.setFullMediaSize();
                        }
                    }
                    else if( sources.eq(0).text().indexOf('vimeo') !== -1) {
                        var vId = sources.eq(0).text().split('/').pop(),
                            vAutoplay = self.autoplay ? '&autoplay=0' : '',
                            video = '<iframe src="http://player.vimeo.com/video/'+ vId +'?api=1&wmode=transparent'+ vAutoplay +'" width="640" height="360" frameborder="0" webkitAllowFullScreen allowFullScreen></iframe>',
                            url = 'http://player.vimeo.com/video/'+ vId,
                            iframe = self.$fwmedia.append(video).find('iframe');

                        self.fwMeElem = {
                            pluginType: 'vimeo',
                            pause: function(){
                                iframe[0].contentWindow.postMessage('{"method":"pause"}', url);
                            }
                        };

                        self.fwplayer = {container: iframe};
                        self.showFWMedia();
                        if( self.$fullGallery.find('a.resize').hasClass('collapsed') ) {
                            self.shrinkVideo();
                        }
                        else {
                            self.setFullMediaSize();
                        }
                    }
                    else {
                        var $poster = $file.find('poster'),
                            posterAttr = $poster.length !== 0 ? ' poster="'+ $poster.text() +'"' : '',
                            video = '<video preload="metadata"'+ posterAttr +'>',
                            safariVideo = '<video preload="metadata"'+ posterAttr +' ';

                        for( var i = 0, len = sources.length; i < len; i++ ) {
                            var filePath = sources.eq(i).text(),
                                fileExt = filePath.split('.').pop();

                            if( fileExt === 'mp4' ) {
                                video += '<source type="video/mp4" src="'+ filePath +'" />';
                                safariVideo += 'type="video/mp4" src="'+ filePath +'"></video>';
                            }
                            else if( fileExt === 'webm' ) {
                                video += '<source type="video/webm" src="'+ filePath +'" />';
                            }
                            else if( fileExt === 'ogv' ) {
                                video += '<source type="video/ogg" src="'+ filePath +'" />';
                            }
                        }

                        video += '</video>';

                        self.isSafari ? self.$fwmedia.append(safariVideo) : self.$fwmedia.append(video);
                        self.$fullGallery.addClass('loading');
                        self.setFWPlayer();
                    }

                    // if( $poster && $poster.length !== 0 ) {
                    //     img = new Image;
                    //     img.src = $poster.text();
                    // }

                    // postImgLoad = function() {
                    //     self.$fwmedia.transition({opacity:1}, self.fwmediaSpeed, self.easing);
                    // }
                }

                // after the image associated with the item is loaded executed necessary function
                if( img && type !=='video' ) {
                    if( img.complete || img.readyState === 'complete' || img.readyState === 4 ) {
                        // image is already in cache so execute immediately
                        postImgLoad();
                    }
                    else {
                        // wait for img to load to execute
                        self.$fullGallery.addClass('loading');
                        img.onload = function() {
                            postImgLoad();
                            self.$fullGallery.removeClass('loading');
                        };
                    }

                    var link = $file.find('link').text(),
                        linkHtml = '';

                    if( link ) {
                        if( self.options.newWindowLinks ) {
                            linkHtml = '<a class="link" href="'+link+'" target="_blank"></a>';
                        }
                        else {
                            linkHtml = '<a class="link" href="'+link+'"></a>';
                        }

                        self.$fwmedia.append(linkHtml);
                    }
                }
                // else {
                //     // no image file (for video without poster) so execute immediately
                //     postImgLoad();
                // }

                // preload the next few large size images
                self.preloadImgs();

            };

            self.fwItemTransition(showNewItem);

        },


        // hide the media in Fullwidth mode using chosen transition
        fwItemTransition: function(callback) {
            var self = novaGallery;

            if( self.options.fullwidthItemTransition === 'flip' && Modernizr.csstransforms3d ) {
                self.$fwmedia.css({transformOrigin: 'center center'}).transition({scale: 0.5, opacity: 0}, self.fwmediaSpeed, self.easing, callback);
            }
            else if( self.options.fullwidthItemTransition === 'slide' && Modernizr.csstransitions ) {
                self.$fwmedia.transition({x: -self.$fwmedia.width()}, self.fwmediaSpeed, self.easing, callback);
            }
            else {
                self.$fwmedia.animate({opacity: 0}, self.fwmediaSpeed, callback);
            }
        },


        // show the media in Fullwidth mode using chosen transition
        showFWMedia: function(){
            var self = novaGallery;

            if( self.options.fullwidthItemTransition === 'flip' && Modernizr.csstransforms3d ) {
                self.$fwmedia.css({opacity: 1, transform: 'scale(0.5) rotateX(90deg)', transformOrigin: 'center 75%'})
                             .transition({perspective: '600px', rotateX: '0deg', scale: 1}, self.fwmediaSpeed*2, self.easing);
            }
            else if( self.options.fullwidthItemTransition === 'slide' && Modernizr.csstransitions ) {
                self.$fwmedia.css({x: self.$fwmedia.width()}).transition({x: 0}, self.fwmediaSpeed, self.easing);
            }
            else {
                self.$fwmedia.animate({opacity:1}, self.fwmediaSpeed);
            }
        },


        // set up the player for fullwidth mode
        setFWPlayer: function() {
            var self = novaGallery,
                mode;

            if( self.isChrome ) {
                mode = 'shim';
            }
            else if( self.isIE9 && self.$fwmedia.data('type') === 'video' ) {
                mode = 'shim';
            }
            else {
                mode = 'auto';
            }

            self.$fullGallery.find('audio,video').mediaelementplayer({
                hideVolumeOnTouchDevices: self.isAndroid ? true : false,
                startVolume: self.storeVolume && self.volume ? self.volume : 1.0,
                loop: self.loop,
                pauseOtherPlayers: false,
                mode: mode,
                success: function(me, node, player) {
                    // if( !self.isChrome ) {
                    //     self.$fullGallery.removeClass('loading');
                    //     self.$fwmedia.transition({opacity:1}, self.fwmediaSpeed, self.easing);
                    // }

                    self.fwMeElem = me;
                    self.fwplayer = player;

                    if( self.ie9js ) {   //reapply css styles when using IE9.js
                        IE7.recalc();
                    }

                    if( me.tagName.toLowerCase() === 'video' ) {
                        // if( me.src.indexOf('youtube') !== -1 || me.src.indexOf('vimeo') !== -1 ) {
                        //     var eventType = 'canplay';
                        // }
                        // else {
                        //     var eventType = 'loadedmetadata';
                        // }

                        // iOS does not preload video, so resize video immediately
                        if( self.isiOS || self.isAndroid ) {
                            self.$fullGallery.removeClass('loading');
                            self.showFWMedia();

                            if( self.$fullGallery.find('a.resize').hasClass('collapsed') ) {
                                self.shrinkVideo();
                            }
                            else {
                                self.setFullMediaSize();
                            }

                            player.container.css('opacity', '1').find('div.mejs-poster').css('opacity', '1');
                        }
                        else {
                            me.addEventListener('loadedmetadata', function(){
                                self.$fullGallery.removeClass('loading');
                                self.showFWMedia();

                                if( self.$fullGallery.find('a.resize').hasClass('collapsed') ) {
                                    self.shrinkVideo();
                                }
                                else {
                                    self.setFullMediaSize();
                                }

                                player.container.css('opacity', '1');
                                player.media.pluginType !== 'native' && player.container.find('div.mejs-poster').css('opacity', '1');
                            }, false);
                        }

                        // unbind click event from player fullscreen button if browser supports HTML5 Fullscreen API or if browser is Opera
                        (self.html5FS || self.isOpera) && player.media.pluginType === 'native' && player.container.find('div.mejs-fullscreen-button').off('click');
                    }

                }
            });
        },


        // set the size of the fullwidth gallery
        setFullwidthSize: function() {
            var self       = novaGallery,
                type       = self.$fwmedia.data('type'),
                $bTitle    = self.$fullGallery.find('p.title'),
                $container = self.displayType === 'container' ? self.$novaGallery.parent() : self.$window;

            if( document.fullScreenElement || document.mozFullScreenElement || document.webkitIsFullScreen ) {
                $container = self.$window;
            }

            $bTitle.css({ width: $bTitle.parent().width() - $bTitle.prev().outerWidth(true) - $bTitle.next().outerWidth(true) - parseInt($bTitle.css('margin-left'), 10) - 20 });
            self.$fullGallery.css({ height: $container.height() - self.$novaGallery.find('menu').height() });
            self.$fwmedia.height( self.$fullGallery.height() - self.$fullGallery.find('div.fwBottom').height() );
            type !== 'photo' && !self.fwplayer && self.setFWPlayer();
            self.setThumbnailsSlider();
            if( self.$fullGallery.find('a.resize').hasClass('collapsed') ) {
                if( type === 'video' ) {
                    self.shrinkVideo();
                }
                else {
                    self.resizeImage( self.$fwmedia.find('img')[0], 'fullwidth' );
                }
            }
            else {
                self.setFullMediaSize();
            }
        },


        // show/hide the thumbnails in Fullwidth mode
        showFullwidthThumbs: function() {
            var self         = novaGallery,
                isVideo      = self.$fwmedia.data('type') === 'video' ? true: false,
                isCollapsed  = self.$fullGallery.find('a.resize').hasClass('collapsed'),
                $img         = self.$fwmedia.find('img'),
                isFlashVideo = isVideo
                               && (self.fwMeElem.pluginType === 'flash'
                                   || self.fwMeElem.pluginType === 'youtube'
                                   || self.fwMeElem.pluginType === 'vimeo') ? true: false;

            if( $(this).hasClass('active') ) {
                self.$fwmedia.animate({height: self.$fullGallery.height() - self.$fullGallery.find('div.bottom-bar').height()}, {
                    duration: 600,
                    step: function(val){
                        if( !isFlashVideo ) {
                            if( isCollapsed ) {
                                self.resizeImage( $img[0], 'fullwidth' );
                            }
                            else {
                                self.setFullMediaSize();
                            }
                        }
                    },
                    complete: function() {
                        if( isFlashVideo ) {
                            if( isCollapsed ) {
                                self.shrinkVideo();
                            }
                            else {
                                self.setFullMediaSize();
                            }
                        }
                    }
                });

                self.$fullGallery.find('div.thumbnails').transition({height: 0}, 600, self.easing);
                $(this).removeClass('active');
            }
            else {
                var thumbHeight = self.$fullGallery.find('li').height(),
                    barHeight = self.$fullGallery.find('div.bottom-bar').height();

                self.$fullGallery.find('div.thumbnails').transition({height: thumbHeight}, 600, self.easing);
                self.$fwmedia.animate({height: self.$fullGallery.height() - thumbHeight - barHeight}, {
                    duration: 600,
                    step: function(val){
                        if( !isFlashVideo ) {
                            if( isCollapsed ) {
                                self.resizeImage( $img[0], 'fullwidth' );
                            }
                            else {
                                self.setFullMediaSize();
                            }
                        }
                    },
                    complete: function() {
                        if( isFlashVideo ) {
                            if( isCollapsed ) {
                                self.shrinkVideo();
                            }
                            else {
                                self.setFullMediaSize();
                            }
                        }
                    }
                });

                $(this).addClass('active');
            }

        },


        // set size of the fullwidth media file
        setFullMediaSize: function() {
            var self      = novaGallery,
                mediaType = self.$fwmedia.data('type'),
                fwwidth   = self.$fwmedia.width(),
                fwheight  = self.$fwmedia.height(),
                media,
                mediaWidth,
                mediaHeight,
                aspectRatio;

            if( mediaType === 'video' && self.fwMeElem ) {
                aspectRatio = !self.fwMeElem.videoWidth || self.fwMeElem.videoWidth === -1 ? 640/360 : self.fwMeElem.videoWidth / self.fwMeElem.videoHeight;
            }
            else {
                media = self.$fwmedia.find('img');
                if( media.length === 0 ) {  // required to prevent occasional errors in IE
                    return;
                }
                aspectRatio = media[0].width / media[0].height;
            }

            if( fwwidth / fwheight < aspectRatio ) {
                mediaWidth = fwheight * aspectRatio;
                mediaHeight = fwheight;
            }
            else {
                mediaWidth = fwwidth;
                mediaHeight = fwwidth / aspectRatio;
            }

            if( mediaType === 'video' && self.fwMeElem ) {
                if( self.fwMeElem.pluginType === 'youtube' || self.fwMeElem.pluginType === 'vimeo' ) {
                    self.fwplayer.container.attr({width: fwwidth, height: fwheight});
                }
                else {
                    self.fwMeElem.setVideoSize(mediaWidth, mediaHeight);
                    self.fwplayer.setPlayerSize(fwwidth, fwheight);
                }

                if( self.fwMeElem.pluginType !== 'native' || self.isiOS || self.isAndroid ) {
                    var $poster = self.$fwmedia.find('div.mejs-poster img');

                    if( $poster.length !== 0 ) {
                        $poster.css({ width: mediaWidth, height: 'auto' }).parent().css('line-height', '');
                        // !self.isOpera && $poster.css({ left: (fwwidth - mediaWidth)/2, top: 0});
                    }

                    self.fwplayer.container.css({ top: 'auto', left: 'auto' });
                }
                else {
                    self.$fwmedia.find('div.mejs-mediaelement').css({ top: (fwheight - mediaHeight)/2, left: (fwwidth - mediaWidth)/2});
                }
            }
            else {
                media[0].width = mediaWidth;
                media[0].height = mediaHeight;
                media.css({ left: (fwwidth - mediaWidth)/2, top: (fwheight - mediaHeight)/2});
            }

            self.fwplayer && self.fwplayer.setControlsSize && self.fwplayer.setControlsSize();
        },


        // show the next item in fullwidth mode
        showNextFWItem: function(e) {
            // stop the slideshow if the user manually clicked
            if(e && e.originalEvent && novaGallery.fwClock) {
                novaGallery.resetSlideshow();
            }

            var self          = novaGallery,
                $items        = self.$fullGallery.find('li.filtered'),
                itemnum       = $items.length,
                listWidth     = self.$fullGallery.width() - 2*self.$fullGallery.find('a.slide-next').width(),
                itemWidth     = $items.width(),
                itemsperslide = Math.floor( listWidth / itemWidth ),
                curSlide,
                newSlide;

            if( self.fwIndex === itemnum - 1 ) {
                return;
            }

            curSlide = Math.floor(self.fwIndex/itemsperslide);
            newSlide = Math.floor((self.fwIndex + 1)/itemsperslide);

            curSlide !== newSlide && self.$fullGallery.find('a.slide-next').trigger('click');
            $items.eq(self.fwIndex + 1).trigger('click');
        },


        // show the previous item in fulscreen mode
        showPrevFWItem: function(e) {
            // stop the slideshow if the user manually clicked
            if(e && e.originalEvent && novaGallery.fwClock) {
                novaGallery.resetSlideshow();
            }

            var self = novaGallery,
                $items = self.$fullGallery.find('li.filtered'),
                listWidth = self.$fullGallery.width() - 2*self.$fullGallery.find('a.slide-next').width(),
                itemWidth = $items.width(),
                itemsperslide = Math.floor( listWidth / itemWidth ),
                $newActiveItem,
                curSlide,
                newSlide;

            if( self.fwIndex === 0 ) {
                return;
            }

            curSlide = Math.floor(self.fwIndex/itemsperslide);
            newSlide = Math.floor((self.fwIndex - 1)/itemsperslide);

            curSlide !== newSlide && self.$fullGallery.find('a.slide-prev').trigger('click');
            $items.eq(self.fwIndex - 1).trigger('click');
        },


        // set up the autoplay for fullwidth mode
        FWSlideshow: function() {
            var self = novaGallery,
                $btn = $(this),
                $progress = self.$fullGallery.find('div.progress').stop().css('width', '0');

            if( self.fwClock ) {
                clearInterval(self.fwClock);
                self.fwClock = null;
                $btn.removeClass('pause');
            }
            else {
                $progress.animate({width: '100%'}, self.pauseTime + self.fwmediaSpeed, 'linear');
                self.fwClock = setInterval(function(){
                    var $items = self.$fullGallery.find('li.filtered'),
                        itemnum = $items.length;

                    if( self.fwIndex === itemnum - 1 ) {
                        $items.eq(0).trigger('click');
                        $items.eq(0).transition({marginLeft: 0}, 600);
                        $items.parent().prev('a.slide-prev').addClass('disabled').end().next('a.slide-next').removeClass('disabled');
                    }
                    else {
                        self.showNextFWItem();
                    }

                    $progress.stop().css('width', '0').animate({width: '100%'}, self.pauseTime + self.fwmediaSpeed, 'linear');
                }, self.pauseTime + self.fwmediaSpeed);

                $btn.addClass('pause');
            }
        },


        // reset the fullwidth slideshow if the user manually chooses an item
        resetSlideshow: function() {
            var self = novaGallery;

            if( self.fwClock ) {
                clearInterval(self.fwClock);
                self.fwClock = null;
                self.FWSlideshow();
            }
        },


        // shrink/expand media for fullwidth gallery
        resizeFWItem: function() {
            var self = novaGallery,
                $resize = self.$fullGallery.find('a.resize');

            if( $resize.hasClass('collapsed') ) {
                self.setFullMediaSize();
                $resize.removeClass('collapsed');
            }
            else {
                if( self.$fwmedia.data('type') === 'video' ) {
                    self.shrinkVideo();
                }
                else {
                    self.resizeImage( self.$fwmedia.find('img')[0], 'fullwidth' );
                }
                $resize.addClass('collapsed');
            }
        },


        // resize video when in collapsed state
        shrinkVideo: function() {
            if( !novaGallery.fwMeElem )  {
                return;
            }

            var self = novaGallery,
                maxw = self.$fwmedia.width(),
                maxh = self.$fwmedia.height(),
                maxr = maxw/maxh,
                vw   = self.fwMeElem.videoWidth === -1 || !self.fwMeElem.videoWidth ? 640 : self.fwMeElem.videoWidth,
                vh   = self.fwMeElem.videoHeight === -1 || !self.fwMeElem.videoHeight ? 360 : self.fwMeElem.videoHeight,
                vr   = vw/vh;

            if( vw > maxw || vh > maxh ) {
                if( vr === maxr ) {
                    vw = maxw;
                    vh = maxh;
                }
                else {
                    vw = maxh*vr;
                    vh = maxh;

                    if(vw > maxw) {
                        vw = maxw;
                        vh = maxw/vr;
                    }
                }
            }


            var $poster = self.$fwmedia.find('div.mejs-poster img');
            if( self.fwMeElem.pluginType !== 'native' || self.isiOS || self.isAndroid ) {
                if( self.fwMeElem.pluginType === 'youtube' || self.fwMeElem.pluginType === 'vimeo' ) {
                    self.fwplayer.container.attr({width: vw, height: vh});
                }
                else {
                    self.fwMeElem.setVideoSize(vw, vh);
                    self.fwplayer.setPlayerSize(vw, vh);
                    self.fwplayer.setControlsSize();
                }

                if( $poster.length !== 0 ) {
                    $poster.css({ width: vw, height: 'auto' }).parent().css('line-height', vh+'px');
                //     $poster.css({ top: (vh - $poster[0].height)/2, left: (vw - $poster[0].width)/2 });
                }

                self.fwplayer.container.css({ top: (maxh - vh)/2, left: (maxw - vw)/2 });
                // self.$fwmedia.find('div.me-plugin').css({ top: 0, left: 0});
            }
            else {
                self.fwMeElem.setVideoSize(vw, vh);
                self.fwplayer.setPlayerSize(maxw, maxh);
                self.fwplayer.setControlsSize();
                self.$fwmedia.find('div.mejs-mediaelement').css({ top: (maxh - vh)/2, left: (maxw - vw)/2 });
            }
        },


        // show the caption for Fullwidth mode
        showFWCaption: function() {
            var self = novaGallery,
                fileIndex = self.$fwActiveItem.data('id'),
                $file = self.$files.eq(fileIndex),
                $parent = self.options.displayType === 'container' ? self.$novaGallery.parent() : self.$window,
                width,
                height,
                top,
                left;

            if( self.$fwOverlay.is(':visible') ) {
                return;
            }

            self.$fwOverlayContent
            .html('<h2></h2><p></p>')
            .find('h2').html( $file.find('title').text() )
            .end()
            .find('p').html( $file.find('description').text() );

            self.$fwOverlay.addClass('hidden');
            self.$fwOverlayContent.css('max-height', $parent.height() - self.$fwOverlayContent.outerHeight(true) - 100);
            width = self.$fwOverlay.outerWidth();
            height = self.$fwOverlay.outerHeight();
            self.$fwOverlay.removeClass('hidden');
            top = self.$fwmedia.height()/2 - height/2;
            left = self.$fwmedia.width()/2 - width/2;

            self.$fwOverlay.css({ top: top - 100, left: left, display: 'block', opacity: 0 })
            .transition({ top: top, opacity: 1 }, 600, self.easing);
        },


        // close the fullwidth caption
        closeFWCaption: function() {
            var self = novaGallery;

            self.$fwOverlay.transition({ top: '-=100px', opacity: 0 }, 600, self.easing, function(){
                self.$fwOverlay.hide();
                self.$fwOverlayContent.empty();
            });
        },


        // function to set the size of the thumbnails slider in fullwidth mode
        setThumbnailsSlider: function() {
            var self        = novaGallery,
                $list       = self.$fullGallery.find('ul'),
                $items      = $list.find('li.filtered'),
                itemnum     = $items.length,
                listWidth   = self.$fullGallery.width() - 2*self.$fullGallery.find('a.slide-next').width(),
                itemWidth   = $items.width(),
                itemsperslide,
                activeIndex = $items.index( $items.filter('li.active') ),
                ml          = 0,
                slides      = 0;


            itemsperslide = Math.floor( listWidth / itemWidth );
            ml = -Math.floor((activeIndex + 1)/itemsperslide)*itemWidth*itemsperslide;
            slides = Math.ceil(itemnum/itemsperslide);
            $list.width( itemWidth*itemsperslide );
            $list.data('slides', slides);
            $items.eq(0).css('margin-left',  ml);

            if( ml === 0 ) {
                $list.prev('a.slide-prev').addClass('disabled');
                $list.next('a.slide-next').removeClass('disabled');
            }
            else if( ml === -slides*$list.width() ) {
                $list.prev('a.slide-prev').removeClass('disabled');
                $list.next('a.slide-next').addClass('disabled');
            }
            else {
                $list.prev('a.slide-prev').removeClass('disabled');
                $list.next('a.slide-next').removeClass('disabled');
            }

            slides === 1 ? $list.addClass('centerItems').next('a.slide-next').addClass('disabled') : $list.removeClass('centerItems');
        },


        thumbnailsSlideNext: function() {
            var self   = novaGallery,
                $next  = $(this),
                $list  = self.$fullGallery.find('ul'),
                $items = $list.find('li.filtered');

            if( $next.hasClass('disabled') ) {
                return;
            }
            else {
                $next.siblings('a.slide-prev').removeClass('disabled');
                $items.eq(0).transition({ marginLeft: '-=' + $list.width() }, 600, self.easing, function(){
                    if( parseInt( $items.eq(0).css('margin-left'), 10) === -($list.data('slides') - 1)*$list.width() ) {
                        $next.addClass('disabled');
                    }
                });
            }
        },


        thumbnailsSlidePrev: function() {
            var self   = novaGallery,
                $prev  = $(this),
                $list  = self.$fullGallery.find('ul'),
                $items = $list.find('li.filtered');

            if( $prev.hasClass('disabled') ) {
                return;
            }
            else {
                $prev.siblings('a.slide-next').removeClass('disabled');
                $items.eq(0).transition({ marginLeft: '+=' + $list.width() }, 600, self.easing, function(){
                    if( parseInt( $items.eq(0).css('margin-left'), 10) === 0 ) {
                        $prev.addClass('disabled');
                    }
                });
            }
        },


        // scroll the thumbnails in fullwidth mode using touch
        touchSlide: function(e) {
            var self = novaGallery;

            if( e.type === 'touchstart' ) {
                self.touchStartPos = e.originalEvent.touches[0].pageX;
            }
            else if( e.type === 'touchmove' ) {
                e.preventDefault();
                self.touchEndPos = e.originalEvent.touches[0].pageX;
            }
            else if( e.type === 'touchend' ) {
                if( !self.touchEndPos ) {   // ensure that taps/clicks are not prcessed
                    return;
                }

                if( self.touchEndPos - self.touchStartPos >= 100 ) {
                    self.$fullGallery.find('a.slide-prev').trigger('click');
                }
                else if( self.touchEndPos - self.touchStartPos <= -100 ) {
                    self.$fullGallery.find('a.slide-next').trigger('click');
                }

                self.touchEndPos = null;
            }
        },


        // function to preload large size images for the Fullwidth mode
        preloadImgs: function() {
            var self      = novaGallery,
                fileindex = self.$fwActiveItem.data('id'),
                curFile   = self.$files.eq(fileindex),
                nextFile  = curFile.next(),
                type      = '',
                num       = self.preloadNumber ? self.preloadNumber : 3;

            for( var i = 0; i < num; i++ ) {
                var img = new Image;
                type = nextFile.attr('type');

                if( type === 'photo' ) {
                    img.src = nextFile.find('source').text();
                }
                else if( type === 'audio') {
                    img.src = nextFile.find('poster').text();
                }
                else if( type === 'video' ) {
                    img.src = nextFile.find('poster').text();
                }

                nextFile = nextFile.next();
            }

        },


        // handle keyboard events for the two gallery view modes
        handleKeys: function(e) {
            var key = e.keyCode || e.charCode,
                self = novaGallery;

            if( self.$fullGallery.is(':visible') ) {
                if( key === 39 ) {  // right key
                    self.fwClock && self.resetSlideshow();
                    self.showNextFWItem();
                }
                else if( key === 37 ) {  // left key
                    self.fwClock && self.resetSlideshow();
                    self.showPrevFWItem();
                }
                else if( key === 27 ) {   // esc key
                    self.closeFWCaption();
                }
            }
            else if( self.$thumbGrid.is(':visible') ) {
                if( key === 39 ) {  // right key
                    self.overlayNext();
                }
                else if( key === 37 ) {  // right key
                    self.overlayPrev();
                }
                else if( key === 27 ) {  // esc key
                    self.overlayClose();
                }
            }
        },


        // handle cicks on the player fullscreen button in Opera
        operaMEFS: function() {
            var self = novaGallery;

            if( self.fwplayer.media.pluginType === 'native' ) {
                if( self.fwplayer.container.hasClass('mejs-container-fullscreen') ) {
                    self.fwplayer.container.removeClass('mejs-container-fullscreen');
                    $(this).addClass('mejs-fullscreen').removeClass('mejs-unfullscreen');
                    self.$fullGallery.css('overflow','hidden');
                    self.$fwmedia.css('overflow','hidden');
                }
                else {
                    self.fwplayer.container.addClass('mejs-container-fullscreen');
                    $(this).removeClass('mejs-fullscreen').addClass('mejs-unfullscreen');
                    self.$fullGallery.css('overflow','visible');
                    self.$fwmedia.css('overflow','visible');
                }
            }
        },


        // exit the player fullscreen mode when ESC key is pressed in Opera
        operaEscPlayerFS: function(e) {
            var key = e.keyCode || e.charCode,
                self = novaGallery;

            if( key === 27 && self.fwplayer.media.pluginType === 'native' && self.fwplayer.container.hasClass('mejs-container-fullscreen') ) {
                self.fwplayer.container.removeClass('mejs-container-fullscreen')
                .find('div.mejs-fullscreen-button').addClass('mejs-fullscreen').removeClass('mejs-unfullscreen');

                self.$fullGallery.find('div.fwBottom').show();
                self.$novaGallery.find('menu').show();
                self.$fullGallery.css('overflow','hidden');
                self.$fwmedia.css('overflow','hidden');
            }
        },


        // handle the fullscreen mode of the player when the player fullscreen button is clicked in a browser that supports HTML5 Fullscreen api
        nativeMEFS: function() {
            // check if the gallery is in fullscreen display, if it is then exit from it
            var self = novaGallery,
                elem = document.fullScreenElement ? document.fullScreenElement :
                       document.mozFullScreenElement ? document.mozFullScreenElement :
                       document.webkitFullScreenElement ? document.webkitFullScreenElement : null,
                mode = self.$thumbGrid.is(':visible') ? 'thumbnails' : 'fullwidth';

            if( !elem ) {
                mode === 'thumbnails' ? self.thumbPlayer.enterFullScreen() : self.fwplayer.enterFullScreen();
            }
            else {
                if( $(elem).hasClass('mejs-video') ) {
                    mode === 'thumbnails' ? self.thumbPlayer.exitFullScreen() : self.fwplayer.exitFullScreen();
                }
                else {
                    mode === 'thumbnails' ? self.thumbPlayer.enterFullScreen() : self.fwplayer.enterFullScreen();
                }
            }
        },


        // function get the proper vendor-prefixed page-visibility attribute
        getHiddenProp: function() {
            var prefixes = ['webkit','moz','ms','o'];

            // if 'hidden' is natively supported just return it
            if ('hidden' in document) {
                return 'hidden';
            }

            // otherwise loop over all the known prefixes until we find one
            for (var i = 0; i < prefixes.length; i++){
                if ( (prefixes[i] + 'Hidden') in document ) {
                    return prefixes[i] + 'Hidden';
                }
            }

            // otherwise it's not supported
            return null;
        },


        // function to check if the page is hidden
        isPageHidden: function() {
            var prop = novaGallery.getHiddenProp();
            if( !prop ) {
                return false;
            }

            return document[prop];
        },


        // if the page is hidden then stop the fullwidth mode slideshow and also pause any audio/video that is playing
        pageVisChange: function() {
            var self = novaGallery;

            if( self.isPageHidden() ) {
                if( self.fwClock ) {
                    clearInterval(self.fwClock);
                    self.fwClock = null;
                    self.$fullGallery.find('a.slideshow').removeClass('pause');
                    self.$fullGallery.find('div.progress').stop().css('width', '0');
                }

                if( self.fwMeElem ) {
                    self.fwMeElem.pause();
                }

                if( self.thumbMeElem ) {
                    self.thumbMeElem.pause();
                }
            }
        },

        // function to log messages in a cross-browser manner
        ngLog: function() {
            if( window.console && window.console.log ) {
                console.log('[novaGallery] ' + Array.prototype.slice.call(arguments));
            }
            else {
                alert( '[novaGallery] ' + Array.prototype.slice.call(arguments).join('<br>') );
            }
        }


    }  // end novaGallery




    // create the jquery plugin
    $.novaGallery = function(options) {
        novaGallery.options = $.extend( true, {}, $.novaGallery.defaults, options );
        var $galleryContainer = $('#novaGallery'),
            opts = novaGallery.options;

        if( ! $.data($galleryContainer[0], 'novaGallery') ) {  // check if the gallery has already been initialized
            $.data($galleryContainer[0], 'novaGallery', true);

            if( opts.flickr ) {
                $('#filterButtons').hide();

                if( opts.flickrOptions.sourceType === 'collection' ) {
                    novaGallery.loadFlickrCollection( opts.flickrOptions );
                }
                else {
                    novaGallery.loadFlickrData( opts.flickrOptions );
                }
            }
            else if (opts.picasa ) {
                $('#filterButtons').hide();
                novaGallery.loadPicasaData( opts.picasaOptions );
            }
            else {
                var xmlFile = opts.configUrl;
                if( opts.detectMobile ) {
                    $.ajax({
                        type: 'GET',
                        url: 'includes/mobile.php',
                        dataType: 'text',
                        success: function(data) {
                            if( data === 'true') {
                                xmlFile = opts.mobileConfigUrl;
                            }
                            novaGallery.loadConfig( xmlFile );
                        }
                    });
                }
                else {
                    novaGallery.loadConfig( xmlFile );
                }
            }
        }
    }


    // default options
    $.novaGallery.defaults = {
        autoplay: true,
        loop: false,
        storeVolume: true,
        startMode: 'thumbnails',  // thumbnails, fullwidth
        fullwidthResize: false,
        showFullwidthThumbs: true,
        thumbnailsAppearAnimation: 'fadeSeq',  // fade, slide, fadeSeq, slideSeq, flipSeq
        thumbnailsCaptionAnimation: 'flip',  // flip, fade
        fullwidthItemTransition: 'fade',  // flip, slide, fade
        homescreenAnimation: 'scale',  // scale, fade, slide
        displayType: 'window',  // window, container
        newWindowLinks: true,
        useYoutubeThumbs: true,
        useVimeoThumbs: true,
        shuffleItems: true,
        preloadNumber: 5,
        slideshow: false,
        pauseTime: 5000,
        configUrl: 'config.xml',
        detectMobile: false,
        mobileConfigUrl: 'config-mobile.xml',
        enableCache: true,
        cacheFolder: 'cache',
        cacheInterval: 10,  // time in minutes
        flickr: false,
        flickrOptions: {
            apiKey: '',
            sourceType: 'text',  // text, tags, user, set, group, collection
            sourceId: '',
            userId: '',
            limit: 30,
            sort: 'relevance',
            thumbSize: 's',  // s, q, t
            imageSize: 'l'  // c, l, o
        },
        picasa: false,
        picasaOptions: {
            sourceType: 'search',  // search, user, album, collection
            username: '',
            album: '',
            search: '',
            limit: 30,
            thumbSize: 288,
            imageSize: 1280
        }
    };


    // force redraw of DOM element to allow for css transitions
    $.fn.redraw = function(){
        return this.each(function(){
            var redraw = this.offsetHeight;
        });
    };


}) (jQuery, document, window);