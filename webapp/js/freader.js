$(document).ajaxStart(function() {
    if($( "#ajaxLoader" ).is(':hidden'))
        $( "#ajaxLoader" ).fadeIn();
});

$(document).ajaxStop(function() {
    if($( "#ajaxLoader" ).is(':visible'))
        $( "#ajaxLoader" ).fadeOut();
});

$(document).ajaxError(function(e, request) {
    var responseText = jQuery.parseJSON(request.responseText);
    $(".feedContainer").before('<div class="alert alert-error"><button type="button" class="close" data-dismiss="alert">&times;</button><strong>'+responseText.status+'!</strong> '+responseText.message+'</div>');
    $('.alert').alert();
});

if(typeof console === "undefined") {
    console = {
        log: function() { },
        debug: function() { },
        error: function() { },
        info: function() { }
    };
}

var setPreference = function(key,value){
    preference[key] = value;
    preference['offset'] = 0;
    loadItems(true);
};

var loadItems = function(clearAll){
    $(".alert").remove();

    if(clearAll) {
        //clean all items
        $('.feed').remove();
    }

    $.post('?action=item-list', preference, function(data) {
        if(data.refreshNavList == true)
            initNavbar();

        $("#currentTitle").html(data.title);
        if(data.items && data.items.length < 1 && !$('.feed').length) {
            var itemString = '<div class="feed">';
            itemString += '    <div class="feedBody">There is no item to be shown for the selected subscription at this point of time.</div>';
            itemString += '</div>';

            $('.feedContainer').append(itemString);
            return;
        }
        $.each(data.items,function(idx,item){
            var itemString = '<div class="feed" id="item-'+item.id+'" data-read='+item.read+' data-star='+item.star+' data-channel="'+item.channel_id+'">';
            itemString += '    <div class="feedDate">'+item.date+'</div>';
            itemString += '    <div class="feedTitle"><a href="'+item.link+'" target="_blank"><h2>'+item.title+'</h2></a></div>';
            if(item.author)
                itemString += '    <div class="feedAuthor">'+item.author+'</div>';
            itemString += '    <div class="feedBody">'+item.body+'</div>';
            itemString += '    <div class="clear"></div>';
            itemString += '    <div class="feedFooterNav ui-icon-freader"><ul>';
            itemString += '         <li><a href="#" class="itemStar"><span class="ui-icon-star'+(item.star?'red':'')+'"></span></a></li>';
            itemString += '         <li><a href="#" class="itemUnread">Keep Unread</a></li>';
            itemString += '    </ul></div>';
            itemString += '</div>';

            $('.feedContainer').append(itemString);
        });

        //resetting all behavior
        $('.feed').find('a').unbind('click').click(function(){
            var feed = $(this).closest('.feed');
            var id = $(feed).attr('id').substring(5);
            markRead(id,true);
        });

        $('.itemStar').unbind('click').click(function(){
            var obj = $(this);
            var feed = $(obj).closest('.feed');
            var id = $(feed).attr('id').substring(5);
            var star = $(feed).attr('data-star')=="true"?"false":"true";
            markStar(id,star);
        });

        $('.itemUnread').unbind('click').click(function(){
            var obj = $(this);
            var feed = $(obj).closest('.feed');
            var id = $(feed).attr('id').substring(5);
            markRead(id,false);
        });

        preference.offset += data.items.length;
        preference.loading = false;
    });

};

var winResize = function(){
    //manually adjust height
    $('.navbar').css('maxHeight',$(window).height() - 97);
    $('.feeds').css('maxHeight',$(window).height() - 132);
    $('.feedContainer').css('paddingBottom',$(window).height()/2);
}

var markRead = function(id,read){
    var channelId = $("#item-"+id).data('channel')
    $.post('?action=read-item', {id:id,read:read,channelId:channelId}, function(data) {
        if(data.status=='Ok') {
            $('#item-'+id).attr('data-read',read==true?"true":"false");
            if(read) {
                //update channel count
                var channelNode = $tree.tree('getNodeById', channelId);
                var count = $(channelNode.element).find('.unread').html();
                if(count<2)
                    $(channelNode.element).find('.unreadwrapper').remove();
                else
                    $(channelNode.element).find('.unread').html(count-1);

                //update parent count
                if(channelNode.parent && channelNode.parent.element) {
                    count = $(channelNode.parent.element).find('.unread:first').html();
                    if(count<2)
                        $(channelNode.parent.element).find('.unreadwrapper').remove();
                    else
                        $(channelNode.parent.element).find('.unread:first').html(count-1);
                }

                //update channel count
                channelNode = $tree.tree('getNodeById', 'allitems');
                count = $(channelNode.element).find('.unread').html();
                if(count<2)
                    $(channelNode.element).find('.unreadwrapper').remove();
                else
                    $(channelNode.element).find('.unread').html(count-1);
            }
        }
    });
}

var markStar = function(id,star){
    $.post('?action=star-item', {id:id,star:star}, function(data) {
        if(data.status=='Ok') {
            $('#item-'+id).attr('data-star',star=="true"?"true":"false");
            $('#item-'+id).find('.itemStar').find('span').attr('class','').addClass(star=="true"?'ui-icon-starred':'ui-icon-star');
        }
    });
}

var search = function(){
    if($.trim($('#searchText').val()).length<1) return;
    preference['class'] = 'search';
    preference['id'] = null;
    preference['offset'] = 0;
    preference['text'] = $('#searchText').val();
    loadItems(true);
    $('#markreadBtnGroup').hide();
}

var navBarAction = function(){
    $('.edit-channel').unbind('click').click(function(e){
        e.preventDefault();
    });
}
var initNavbar = function(callback){
    //navtree
    //http://mbraak.github.io/jqTree/#examples
    try {
        $('#channelList').tree('destroy');
    } catch(e) {
        //
    }
    $tree = $('#channelList').tree({
        dataUrl: '?action=channel-list',
        autoOpen: 0,
        dragAndDrop: false,
        saveState: true,
        onLoadFailed : function(response){
            //
        },
        onCreateLi: function(node, $li) {
            //add icons
            if(node.id=='starred')
                $li.find('.jqtree-title').before('<span class="tree-icon ui-icon ui-icon-star"></span>');

            //put in icon
            else if(node.nodeClass=='channel'){
                $li.find('.jqtree-title').before('<span class="channel-icon"><img src="'+(node.icon?node.icon:'img/feed-icon16x16.png')+'" alt="[:(]&nbsp;"/></span>');
            }

            if(!isNaN(node.unread) && node.unread>0) {
                $li.find('.jqtree-title').after(' <span class="unreadwrapper">(<span class="unread">'+node.unread+'</span>)</span>');
            }

            //add title attr
            $li.find('.jqtree-title').attr('title',$li.find('.jqtree-title').html());

            //trim long text
            var text = $li.find('.jqtree-title').html();
            var len = node.parent.nodeClass=='tag' ? 20 : 24;
            if(text.length > len) {
                text = text.substr(0,(len-3)) + '...';
                $li.find('.jqtree-title').html(text);
            }
        }
    }).bind('tree.init',function() {
        var selectedNode = $tree.tree('getNodeById', preference.id);
        $tree.tree('selectNode', selectedNode);
        navBarAction();
        if(typeof callback == 'function')
            callback();
    }).bind('tree.contextmenu',function(e) {
        // The clicked node is 'event.node'
        var node = e.node;
    }).bind('tree.click', function(e) {
        if ($tree.tree('isNodeSelected', e.node)) {
            e.preventDefault();
        }
        navClick(e.node);
    })
}

var navClick = function(node){
    preference['class'] = node.nodeClass;
    preference['id'] = node.id;
    preference['name'] = node.name;
    preference['offset'] = 0;
    preference['text'] = '';
    $('#searchText').val('');

    node.nodeClass == 'channel' ? $('#channelBtnGroup').show() : $('#channelBtnGroup').hide();
    node.nodeClass == 'tag' ? $('#tagBtnGroup').show() : $('#tagBtnGroup').hide();
    $('#markreadBtnGroup').show();

    loadItems(true);
}

var getTags = function(){
    var nodes = jQuery.parseJSON($('#channelList').tree('toJson'));
    var tagList = [];
    $.each(nodes,function(idx,node){
        if(node.nodeClass == 'tag')
            tagList.push(node.name);
    });
    return tagList;
}

var refreshCaptcha = function(e){
    $("#suCodeImage").html('<img src="?action=reset_captcha&'+((new Date()).getTime())+'"/>');
    $(e).blur();
};

$(function(){
    $('button').button();
    $(".modal").on('show',function(){
        $(".alert").remove();
    });

    if(!$('.feedContainer').length) {
        //i think this is login screen. let's try init actions

        $("#sendForgotPassword").click(function(){
            $(".alert").remove();
            if($("#fpemail:invalid").length) {
                $("#forgotPasswordDlgBody").prepend("<div class=\"alert alert-error\"><button type=\"button\" class=\"close\" data-dismiss=\"alert\">&times;</button>All fields are required and valid</div>");
                return false;
            }
            $("#forgotPasswordDlgBody").prepend("<div class=\"alert alert-info\">Sending email...</div>");
            $.post('?action=forgot-password', {email:$("#fpemail").val()}, function(data) {
                $(".alert").remove();
                $("#forgotPasswordDlgBody").prepend("<div class=\"alert alert-success\"><strong>Done!</strong> Please check your mailbox for the email we've sent and follow the instructions accordingly.</div>");
            });
        });

        $("#resetPasswordSubmit").click(function(){
            $(".alert").remove();
            if($(".resetPasswordInput:invalid").length || $("#rpPassword").val()!=$("#rpConfirmPassword").val()) {
                $("#resetPasswordDlgBody").prepend("<div class=\"alert alert-error\"><button type=\"button\" class=\"close\" data-dismiss=\"alert\">&times;</button>All fields are required and valid</div>");
                return false;
            }
            $.post('?action=reset-password', {email:$("#rpEmail").val(),code:$("#rpCode").val(),newpassword:$("#rpPassword").val()}, function(data) {
                $(".alert").remove();
                if(data.status == "ok")
                    $("#resetPasswordDlgBody").prepend("<div class=\"alert alert-success\"><strong>Done!</strong> You may now log in with your new password.</div>");
                else
                    $("#resetPasswordDlgBody").prepend("<div class=\"alert alert-error\"><strong>Error!</strong> Please make sure you have filled in correct email address and reset code.</div>");
            });
        });

        $("#signupDlg").on('show',function(e){
            refreshCaptcha(e);
        });

        $("#suSubmit").click(function(){
            $(".alert").remove();
            if($(".suInput:invalid").length || $("#suPassword").val().length<6 || $("#suPassword").val()!=$("#suConfirmPassword").val()) {
                $("#signupDlgBody").prepend("<div class=\"alert alert-error\"><button type=\"button\" class=\"close\" data-dismiss=\"alert\">&times;</button>All fields are required and valid</div>");
                return false;
            }
            $.post('?action=signup', $("#signupForm").serialize(), function(data) {
                $(".alert").remove();
                if(data.status == "ok")
                    location.href="index.php";
                else  {
                    $("#signupDlgBody").prepend('<div class="alert alert-error"><strong>Error!</strong> '+data.message+'</div>');
                    if(data.resetcode) {
                        refreshCaptcha();
                        $("#suCode").val('');
                    }
                }
            });
        });
        return;
    }

    //dialog boxes
    $('#userTab a').click(function(e) {
        e.preventDefault();
        $(this).tab('show');
    })
    $('#saveNewSubscription').click(function(){
        if($("#newSubscriptionUrl").val()) {
            $.post('?action=new-subscription', {url:$('#newSubscriptionUrl').val()}, function(data) {
                initNavbar(function(){
                    $('#channelList').tree('selectNode',$('#channelList').tree('getNodeById', data.id));
                    navClick($('#channelList').tree('getNodeById', data.id));
                    $("#newSubscriptionUrl").val('');
                });
            });
        }
        $('#newSubscriptionDlg').modal('hide');
    });
    $('#editChannelDlg').on('show', function () {
        $('#newTagName').typeahead({
            source: getTags()
        });
        var node = $('#channelList').tree('getNodeById', preference.id);
        $('#newTagName').val(node.tagName?node.tagName:'');
        $('#subscriptionUrl').val(node.url);
    })
    $('#saveChannel').click(function(){
        if($.trim($('#subscriptionUrl').val())=='') {
            $('#editChannelDlgUrlEmptyMsg').show();
            return;
        }
        $.post('?action=edit-channel', {id:preference.id,tag:$('#newTagName').val(),url:$('#subscriptionUrl').val()}, function(data) {
            initNavbar(function(){
                var node = $('#channelList').tree('getNodeById', preference.id);
                $('#channelList').tree('selectNode',node);
                navClick(node);
                $("#newSubscriptionUrl").val('');
            });
            $('#editChannelDlg').modal('hide');
        });
    });
    $('#removeChannelDlg').on('show', function () {
        $('#removeChannelName').html(preference.name);
    })
    $('#confirmRemoveChannel').click(function(){
        $.post('?action=remove-channel', {id:preference.id}, function(data) {
            initNavbar();
            $('#channelBtnGroup').hide();
            $('#removeChannelDlg').modal('hide');
        });
    });
    $('#editTagDlg').on('show', function () {
        $('#tagName').val(preference.name);
    })
    $('#saveTag').click(function(){
        $.post('?action=edit-tag', {id:preference.id,label:$('#tagName').val()}, function(data) {
            var node = $('#channelList').tree('getNodeById', preference.id);
            $('#channelList').tree('updateNode', node, $('#tagName').val());
            preference.name = $('#tagName').val();
            $('#editTagDlg').modal('hide');
        });
    });
    $('#confirmRemoveTag').click(function(){
        $.post('?action=remove-tag', {id:preference.id,removeChannels:$('#removeTagChannels').is(':checked')?1:0}, function(data) {
            initNavbar();
            $('#tagBtnGroup').hide();
            $('#removeTagDlg').modal('hide');
        });
    });

    //actions
    $('#searchBtn').click(function(){
        search();
    });
    $('#searchText').keypress(function(event) {
        if ( event.which == 13 ) {
            search();
        }
    });

    $('.feeds').scroll(function(){
        if($('.feed').length && $('.feed').length>5 && $('.feed:nth-child('+($('.feed').length - 5)+')').position().top < ($(this).height()/2)) {
            if(!preference.loading) {
                preference.loading = true;
                loadItems(false);
            }
        }

        $('.feed').each(function(){
            if($(this).position().top < ($(window).height()/2)) {
                if($(this).attr('data-read')=="false") {
                    var id = $(this).attr('id').substring(5);
                    $(this).attr('data-read',"true");
                    markRead(id,true);
                }
            }
        });
    });

    $('.markRead').click(function(){
        $.post('?action=mark-read', {id:preference.id,class:preference.class,time:$(this).attr('rel')}, function(data) {
            loadItems(true);
        });
    });

    $('#import-now').click(function(){
        $(".alert").remove();

        var file = $("#uploadedfile")[0].files[0];
        if(typeof file == "undefined") {
            $("#import").prepend("<div class=\"alert alert-error\">Please specify file to import.</div>");
            return false;
        }
        var formData = new FormData();
        formData.append('file', file);

        $.ajax({
            url: 'index.php?action=import-opml',
            data: formData,
            processData: false,
            contentType: false,
            type: 'POST',
            success: function(data) {
                $("#import").prepend("<div class=\"alert alert-success\">Imported "+data.tag+" tags and "+data.channel+" channels.</div>");
                initNavbar();
            }
        });
    });

    $("#saveSettings").click(function(){
        $(".alert").remove();
        $(".user-details").each(function(){
            if($(this).val()=="") {
                $("#editPreferenceBody").prepend("<div class=\"alert alert-error\">Please fill in all required fields.</div>");
                return false;
            }
        });
        if($("#password").val() != $("#confirmPassword").val()) {
            $("#editPreferenceBody").prepend("<div class=\"alert alert-error\">Both password must match.</div>");
            return false;
        }
        $.post('?action=save-settings', $("#editPreferenceForm").serialize(), function(data) {
            if(data.status!="ok") {
                $("#editPreferenceBody").prepend("<div class=\"alert alert-error\">"+data.message+"</div>");
                return false;
            }
            $("#currentUser").html($("#email").val());
            $("#editPreferenceDlg").modal('hide');
        });
    });

    $('#editPreferenceDlg').on('show', function () {
        $(".user-password").val('');
    });

    //https://github.com/mbraak/jqTree/issues/19
    $('#collapse').click(function() {
      var tree = $tree.tree('getTree');
      tree.iterate(function(node) {
        if (node.hasChildren()) {
          $tree.tree('closeNode', node, true);
        }
        return true;
      });
    });
    $('#expand').click(function() {
      var tree = $tree.tree('getTree');
      tree.iterate(function(node) {
        if (node.hasChildren()) {
          $tree.tree('openNode', node, true);
        }
        return true;
      });
    });

    $(window).resize(function(){
        winResize();
    });

    //init item load
    winResize();
    initNavbar();
    loadItems();
});

