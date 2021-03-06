/*******https://github.com/linApple/wp_tree**********************/
(function($) {
    "use strict";
    var Style = {};

    function Tree(style) {
        if (Style[style]) {
            this.style = Style[style];
            this.startPoint = "";
            this.events = {
                single: "",
                expanded: "",
                close: ""
            };
            return this;
        }
    }

    function Node(tree, level, obj, type, next, pre, parent, child) {
        this.tree = tree;
        this.obj = obj;
        this.expanded = false;
        this.level = level;
        this.next = next || "";
        this.pre = pre || "";
        this.parent = parent || "";
        this.child = child || "";
        this.type = type || 1;
        this.clickEvent = [];
        this.attribute = {};
    }
    Node.prototype.nextTo = function(i) {
        var p = this;
        while (i > 0) {
            p = p.next;
            i--;
        }
        return p;
    }
    Node.prototype.addEvent = function(fc) {
        if (typeof(fc) == "function") {
            this.clickEvent.push(fc);
        }
    }
    Node.prototype.clickBind = function() {
        var that = this;
        var events = that.tree.events;
        this.obj.unbind("click").click(function() {
            if (that.type == 2) {
                that.expanded = !that.expanded;
                if (that.expanded) {
                    that.tree.style.expand(that.level, that.obj);
                } else {
                    that.tree.style.close(that.level, that.obj);
                }
            }
            for (var i = 0; i < that.clickEvent.length; i++) {
                that.clickEvent[i](that);
            }
            if (that.type == 1) {
                if (typeof(events.single) == "function") {
                    events.single.apply(that);
                }
            } else {
                if (typeof(events.expanded) == "function" && that.expanded) {
                    events.expanded.apply(that);

                }
                if (!that.child || that.child.length == 0) {
                    $.get(that.tree.getUrl(that), "", function(d) {
                        that.tree.afterLoad(that);
                        that.addChildren(that.tree.format(d, that));
                    });
                }
                if (typeof(events.close) == "function" && !that.expanded) {
                    events.close.apply(that);
                }
            }
            return false;
        });
        if (events.buttons) {
            events.buttons.apply(that);
        }
    }
    Node.prototype.changeToSingle = function() {
        if (this.type == 2) {
            this.type = 1;
            var newObj = $(this.tree.style.getSingleNodeHtml(this.level));
            this.tree.style.setSingleText(this.level, newObj, this.tree.style.getMulText(this.level, this.obj));
            this.obj.remove();
            this.obj = newObj;
            if (this.tree.style.addSideBt) {
                this.tree.style.addSideBt(this);
            }
            this.domApply();
        }
        return this;
    }
    Node.prototype.changeToMul = function() {
        if (this.type == 1) {
            this.type = 2;
            var newObj = $(this.tree.style.getMulNodeHtml(this.level));
            this.tree.style.setMulText(this.level, newObj, this.tree.style.getSingleText(this.level, this.obj));
            this.obj.remove();
            this.obj = newObj;
            this.domApply();
        }
        return this;
    }
    Node.prototype.domApply = function(notBind) {
        if (this.pre) {
            this.tree.style.after(this.level, this.pre.obj, this.obj);
        } else if (this.next) {
            this.tree.style.before(this.level, this.obj, this.next.obj);
        } else if (this.parent) {
            this.tree.style.addChild(this.parent.level, this.parent.obj, this.obj);
        } else {
            this.tree.wrap.html(this.obj);
        }
        if (!notBind) {
            this.clickBind();
        }
    }
    Node.prototype.remove = function() {
        if (this.child) {
            function del(point) {
                while (point) {
                    if (point.child) {
                        del(point.child);
                    }
                    point.obj.remove();
                    point = point.next;
                }
            }
            del(this.child);
        }
        if (this.parent) {
            if (this.parent.child === this) {
                this.parent.child = this.next;
                if (!this.next) {
                    this.parent.changeToSingle();
                }
            }
        }
        this.obj.remove();
        if (this === this.tree.startPoint) {
            this.tree.startPoint = this.next;
        }
        if (this.pre) {
            this.pre.next = this.next;
        }
        if (this.next) {
            this.next.pre = this.pre;
        }
    }
    Node.prototype.getAttribute = function(key) {
        return this.attribute[key];
    }
    Node.prototype.setAttribute = function(key, value) {
        this.attribute[key] = value;
    }
    Node.prototype.getText = function() {
        return this.type == 1 ? this.tree.style.getSingleText(this.level, this.obj) : this.tree.style.getMulText(
            this.level, this.obj);
    }
    Node.prototype.setText = function(txt) {
        this.type == 1 ? this.tree.style.setSingleText(this.level, this.obj, txt) : this.tree.style.setMulText(
            this.level, this.obj, txt);
    }
    Node.prototype.getCoord = function() {
        var p = this,
            r = [];
        while (p) {
            var n = 0;
            while (p.pre) {
                n++;
                p = p.pre;
            }
            r.unshift(n)
            p = p.parent;
        }
        return r;
    }
    Node.prototype.addChildren = function(data) {
        this.tree.initChainData(data, this).domApply(this);
    }
    Node.prototype.expand = function() {
        if (this.type == 2 && !this.expanded) {
            this.expanded = !this.expanded;
            this.tree.style.expand(this.level, this.obj);
        }
    }
    Node.prototype.close = function() {
        if (this.type == 2 && this.expanded) {
            this.expanded = !this.expanded;
            this.tree.style.close(this.level, this.obj);
        }
    }
    Node.prototype.lastChild = function() {
        var p = this.child;
        if (p) {
            while (p.next) {
                p = p.next;
            }
        }
        return p;
    }


    Tree.prototype.initChainData = function(data, parentPoint) {
        var that = this;
        var startLevel = parentPoint ? parentPoint.level : 0;
        var point = this.createChainNode(startLevel + 1, data[0].text,
            (data[0].child && data[0].child.length > 0) || data[0].hasChildren ? 2 : 1, data[0].attribute);
        if (parentPoint) {
            if (parentPoint.child) {
                var ppp = parentPoint.child;
                while (ppp.next) {
                    ppp = ppp.next;
                }
                ppp.next = point;
                point.pre = ppp;
                point.parent = parentPoint;
            } else {
                parentPoint.child = point;
                point.parent = parentPoint;
            }
        } else {
            this.startPoint = point;
        }

        function add(d, p, coord) {
            for (var i = 0; i < d.length; i++) {
                coord.push(i);
                if (i > 0) {
                    p.next = that.createChainNode(startLevel + coord.length, d[i].text, (d[i].child && d[i].child.length > 0) || d[i].hasChildren ? 2 : 1, d[i].attribute);
                    p.next.pre = p;
                    p.next.parent = p.parent;
                    p = p.next;
                }
                if (d[i].child && d[i].child.length > 0) {
                    p.child = that.createChainNode(startLevel + coord.length + 1, d[i].child[0].text,
                        (d[i].child[0].child && d[i].child[0].child.length > 0) || d[i].child[0].hasChildren ? 2 : 1,
                        d[i].child[0].attribute);
                    p.child.parent = p;
                    add(d[i].child, p.child, coord);
                }
                coord.pop();
            }
            if (that.style.addLastBt && i > 0) {
                p.next = that.createChainNode(startLevel + p.level, "", 1, p.attribute);
                p.next.pre = p;
                p.next.parent = p.parent;
                that.style.addLastBt(p.next, p);
            }
        }
        add(data, point, []);
        return this;
    }
    Tree.prototype.inner = function(obj) {
        this.wrap = obj;
        this.domApply();
        return this;
    }
    Tree.prototype.domApply = function(pp) {
        var point;
        var that = this;
        if (pp) {
            point = pp.child;
        } else {
            point = this.startPoint;
        }

        function apply(p) {
            var i = 0;
            while (p) {
                if (i == 0) {
                    if (p.level == 1) {
                        that.wrap.html(p.obj);
                    } else {
                        that.style.addChild(p.level - 1, p.parent.obj, p.obj);
                    }
                } else {
                    that.style.after(p.level, p.pre.obj, p.obj);
                }
                if (p.child) {
                    apply(p.child);
                }
                p = p.next;
                i++;
            }
        }
        apply(point);
        return this;
    }
    Tree.prototype.deleteNode = function(coordinate) {
        var p = this.startPoint;
        for (var i = 0; i < coordinate.length; i++) {
            p = p.nextTo(coordinate[i]);
            if (i < coordinate.length - 1) {
                p = p.child;
            }
        }
        p.remove();
    }
    Tree.prototype.addNode = function(coordinate, text, attribute) {
        var newNode = this.createChainNode(coordinate.length, text, 1, attribute);
        var p = this.startPoint;
        if (coordinate.length == 1) {
            if (coordinate[0] == 0) {
                newNode.next = this.startPoint;
                if (this.startPoint.next) {
                    this.startPoint.next.pre = newNode;
                }
                this.startPoint = newNode;
                p = this.startPoint;
            } else {
                var tNode = p.nextTo(coordinate[0] - 1);
                newNode.next = tNode.next;
                newNode.pre = tNode;
                if (tNode.next) {
                    tNode.next.pre = newNode;
                }
                tNode.next = newNode;
            }
        } else {
            for (var m = 0; m < coordinate.length - 1; m++) {
                p = p.nextTo(coordinate[m]);
                if (m < coordinate.length - 2) {
                    p = p.child;
                }
            }
            var n = coordinate[coordinate.length - 1];
            if (n == 0) {
                newNode.next = p.child;
                newNode.parent = p;
                if (!p.child) {
                    p.changeToMul();
                } else {
                    p.child.pre = newNode;
                }
                p.child = newNode;
            } else {
                newNode.parent = p;
                p = p.child.nextTo(n - 1);
                newNode.next = p.next;
                newNode.pre = p;
                if (p.next) {
                    p.next.pre = newNode;
                }
                p.next = newNode;
            }
        }
        newNode.domApply(true);
        return newNode;
    }
    Tree.prototype.createChainNode = function(level, text, type, attribute) {
        var that = this;
        var newObj, newNode;
        if (type == 1) {
            newObj = $(this.style.getSingleNodeHtml(level));
            this.style.setSingleText(level, newObj, text);
        } else {
            newObj = $(this.style.getMulNodeHtml(level));
            this.style.setMulText(level, newObj, text);
        }
        newNode = new Node(this, level, newObj, type);
        if (attribute) {
            newNode.attribute = attribute;
        }
        if (this.style.addSideBt) {
            this.style.addSideBt(newNode);
        }
        newNode.clickBind();
        return newNode;
    }
    Tree.prototype.setEvent = function(fc) {
        this.events = fc;
        return this;
    }
    Tree.prototype.write = function() {
        var that = this;

        function w(p) {
            while (p) {
                var str = "";
                for (var i = 1; i < p.level; i++) {
                    str += "---";
                }
                var txt = p.type == 1 ? that.style.getSingleText(p.level, p.obj) : that.style.getMulText(p.level, p.obj);
                console.debug(str + txt);
                if (p.child) {
                    w(p.child);
                }
                p = p.next;
            }
        }
        w(this.startPoint);
    }
    Tree.prototype.getNode = function(coordinate) {
        var p = this.startPoint;
        for (var i = 0; i < coordinate.length; i++) {
            p = p.nextTo(coordinate[i]);
            if (i < coordinate.length - 1) {
                p = p.child;
            }
        }
        return p;
    }
    Tree.prototype.setUrl = function(fc) {
        this.getUrl = fc;
        return this;
    }
    Tree.prototype.formatData = function(fc) {
        this.format = fc;
        return this;
    }
    Tree.prototype.afterLoad = function(fc) {
        this.afterLoad = fc;
        return this;
    }
    Tree.prototype.autoLoad = function(obj) {
        var that = this;
        $.get(this.getUrl(), "", function(d) {
            if (!d.data) {
                return;
            }
            that.afterLoad();
            that.initChainData(that.format(d));
            that.inner(obj);
        });
        return this;
    }
    window.WpTree = Tree;

    Style.style1 = {
        //这里的i是指树的层级，从第一级开始，这是考虑到有可能不同级的节点dom不一致
        getSingleNodeHtml: function(i) { //没有子节点的节点html
            return "<div class='tree-item' style='display: block;'> " + "<i class = 'tree-dot' > </i>" + "<div class = 'tree-item-name' > Modern Elements </div>" + "</div>";
        },
        getMulNodeHtml: function(i) { //有子节点的节点html
            return "   <div class='tree-folder' style='display: block;'>" + "<div class='tree-folder-header'>" + "<i class='fa fa-folder'></i>" + "<div class='tree-folder-name'>View Category" + "<div class='tree-actions'></div>" + "</div>" + "</div>" + "<div class='tree-folder-content' style='display: none;'>" + "</div>" + "<div class='tree-loader' style='display: none;'><img src='images/input-spinner.gif'></div>" + "</div> ";
        },
        setSingleText: function(i, obj, text) { //设置节点的text方法
            obj.children().eq(1).text(text);
        },
        getSingleText: function(i, obj) { //获取节点text方法
            return obj.children().eq(1).text();
        },
        setMulText: function(i, obj, text) {
            obj.children().eq(0).children().eq(1).text(text);
        },
        getMulText: function(i, obj) {
            return obj.children().eq(0).children().eq(1).text();
        },
        expand: function(i, obj) { //展开节点的dom操作
            obj.children().eq(0).children().eq(0).removeClass("fa-folder").addClass("fa-folder-open");
            obj.children().eq(1).css("display", "block");
        },
        close: function(i, obj) { //收缩节点的dom操作
            obj.children().eq(0).children().eq(0).removeClass("fa-folder-open").addClass("fa-folder");
            obj.children().eq(1).css("display", "none");
        },
        addChild: function(i, parent, child) { //向一个父节点添加第一个子节点的dom操作
            parent.children().eq(1).append(child);
        },
        before: function(i, newO, o) { //节点新节点插入树摸个节点之前的dom操作
            o.before(newO);
        },
        after: function(i, o, newO) { //节点新节点插入树摸个节点之后的dom操作
            o.after(newO);
        }
    };

}(jQuery))
