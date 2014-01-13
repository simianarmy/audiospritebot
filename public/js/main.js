$(function () {
    var $lis = {};
    var numFiles = 0;
    var uploader = new bitcandies.FileUploader({
        url: '/upload',

        enqueued: function (item) {
            item.idx = ++numFiles;
            var $li = $('<tr>').addClass('item_' + item.idx);
            $li.append($('<td>').text(item.idx + ''));
            $li.append($('<td>').addClass('enqueued title').text(item.getFilename()).append($('<div>').addClass('progress').append($('<div>').addClass('progress-bar progress-bar-success'))));
            $li.append($('<td class="volume">').text('?'));
            $lis[item.id] = $li;
            $('#output .file-table').append($li);
        },
        start: function (item) {
            $lis[item.id].removeClass('enqueued').addClass('uploading');
            $('.panel-footer').hide();
        },
        aborted: function (item) {
            $lis[item.id].removeClass('enqueued uploading').addClass('aborted');
        },
        progress: function (item, loaded, total) {
            $lis[item.id].find('.progress .progress-bar-success').css('width', Math.round(loaded / total * 100) + '%');
        },
        success: function (item) {
            $lis[item.id].removeClass('uploading');
            $('.panel-footer').show();
            // spawn volume analyzer script
            $.ajax('/analyze/' + item.getFilename())
                .done(function (data) {
                    if (data.result) {
                        $('tr.item_' + item.idx + ' .volume').text(data.volumes);
                    }
                });
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
    $('.panel-footer').hide();
    $('.generate').on('click', function () {
        alert('generating sprite');
    });
    $('.clear').on('click', function () {
        window.document.location.reload();
    });
});
