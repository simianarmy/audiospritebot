$(function () {
    function refreshState () {
        if ($('.table tr').length <= 1) {
            $('fieldset').attr('disabled', '1');
        } else {
            $('fieldset').removeAttr('disabled');
        }
    }        

    var $lis = {};
    var numFiles = 0;
    var uploader = new bitcandies.FileUploader({
        url: '/upload',

        enqueued: function (item) {
            item.idx = ++numFiles;
            var $li = $('<tr>').addClass('item item_' + item.idx);
            $li.append($('<td>').addClass('enqueued title')
                .append($('<a>').addClass('play').text(item.getFilename()))
                .append($('<div>').addClass('progress')
                .append($('<div>').addClass('progress-bar progress-bar-success'))));
            $li.append($('<td>').addClass('volume')
                .append($('<label>').val('Volume')
                .append($('<input>').attr('size', 4))));
            $li.append($('<td>').addClass('actions')
                .append($('<a>').addClass('remove').text('remove')));
            $lis[item.id] = $li;
            // don't add sprite data files
            if (item.getFilename().indexOf('.js') === -1) {
                $('#output .file-table').append($li);
            }
        },
        start: function (item) {
            $lis[item.id].removeClass('enqueued').addClass('uploading');
            refreshState();
        },
        aborted: function (item) {
            $lis[item.id].removeClass('enqueued uploading').addClass('aborted');
        },
        progress: function (item, loaded, total) {
            $lis[item.id].find('.progress .progress-bar-success').css('width', Math.round(loaded / total * 100) + '%');
        },
        success: function (item, xhr) {
            var url = JSON.parse(xhr.responseText).url;

            if (url && url !== '') {
                $('.item_' + item.idx + ' .title').append($('<audio>').attr({
                    'id': item.getFilename(),
                    'src': url,
                    'preload': 'auto'
                }));
            }
            $lis[item.id].removeClass('uploading');
            $('.item_' + item.idx + ' .progress').remove();
            refreshState();

            // request volume analysis from server if audio file
            if (item.getFilename().indexOf('.js') === -1) {
                $.ajax('/analyze/' + item.getFilename())
                    .done(function (data) {
                        if (data.result) {
                            $('tr.item_' + item.idx + ' .volume input').val(data.rms);
                        }
                    });
            }
        },
        error: function (item) {
            $lis[item.id].removeClass('uploading');
        }
    });

    $('#file').change(function () {
        var files = document.getElementById('file').files;
        for (var i = 0; i < files.length; ++i) {
            uploader.add(files[i]);
        }
        return false;
    });
    // make audio selections sortable
    $('.sortable').sortable({
        revert: true
    });
    // the meaty one
    $('.generate').on('click', function () {
        // Send ordered file list with volumes as form data
        var files = [],
            volumes = [];

        $('.file-table tr').each(function (index) {
            files.push($('a.play', this).text());
            volumes.push($('td.volume input', this).val());
        });
        console.log('files', files);
        console.log('volumes', volumes);
        // send it off - not AJAX
        window.location='/generate?' + $.param({files: files, 
            volumes: volumes, 
            genSource: $('#gen-source').is(':checked'),
            silence: $('#gen-silence').is(':checked'),
            silenceLen: parseInt($('#silence-len').val(), 10),
            formats: $("input:radio[name ='formats']:checked").val()
        });
    });
    // reload page on clear button
    $('.clear').on('click', function () {
        window.document.location.reload();
    });
    // audio plays on filename click
    $('.table').on('click', '.play', function (el) {
        var audio = $('audio', this.parentElement)[0];
        if (audio) {
            audio.play();
        }
        event.stopPropagation();
    });
    $('table').on('click', '.remove', function (el) {
        $(this).parents('.item').remove();
        refreshState();
    });
    refreshState();
});
