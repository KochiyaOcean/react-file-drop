(function(root, factory) {
    if (typeof exports !== "undefined") {
        var React = require("react");
        var PropTypes = require('prop-types')
        var CreateReactClass = require('create-react-class')
        module.exports = factory(React, PropTypes);
    }
    else if (typeof define === "function" && define.amd) {
        define(["react", "prop-types"], function(React, PropTypes) {
            return factory(React, PropTypes, CreateReactClass);
        });
    }
    else {
        factory(root.React, root.PropTypes, root.CreateReactClass);
    }
}(this, function(React, PropTypes, CreateReactClass) {
    var accepts = require('attr-accept')
    var FileDrop = CreateReactClass({
        displayName: "FileDrop",

        propTypes: {
            onDrop: PropTypes.func,
            onDragOver: PropTypes.func,
            onDragLeave: PropTypes.func,
            dropEffect: PropTypes.oneOf(["copy", "move", "link", "none"]),
            targetAlwaysVisible: PropTypes.bool,
            acceptType: PropTypes.string,
            frame: function (props, propName, componentName) {
                var prop = props[propName];
                if (prop == null) {
                    return new Error("Warning: Required prop `" + propName + "` was not specified in `" + componentName + "`");
                }
                if (prop !== document && prop !== window && !(prop instanceof HTMLElement)) {
                    return new Error("Warning: Prop `" + propName + "` must be one of the following: document, window, or an HTMLElement!");
                }
            },
            onFrameDragEnter: PropTypes.func,
            onFrameDragLeave: PropTypes.func,
            onFrameDrop: PropTypes.func
        },

        getDefaultProps: function () {
            return {
                dropEffect: "copy",
                frame: document,
                targetAlwaysVisible: false,
                acceptType: ""
            };
        },

        // getInitialState: in componentWillMount, we call this.resetDragging();

        resetDragging: function () {
            this._dragCount = 0;
            this.setState({draggingOverFrame: false, draggingOverTargetAccept: false, draggingOverTargetReject: false});
        },

        _verifyFileType: function (files) {
            var _this = this
            return files.every(function(file) {
                return accepts(file, _this.props.acceptType)
            });
        },

        _handleDrop: function (event) {
            event.preventDefault();
            if (this.state.draggingOverTargetReject) return;
            if (this.props.onDrop) {
                var files = (event.dataTransfer) ? event.dataTransfer.files : (event.frame) ? event.frame.files : undefined;
                this.props.onDrop(files, event);
            }
        },

        _handleDragOver: function (event) {
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = this.props.dropEffect;

            // set active drag state only when file is dragged into
            // (in mozilla when file is dragged effect is "uninitialized")
            var effectAllowed = event.dataTransfer.effectAllowed;
            var dataTransferItems = event.dataTransfer && event.dataTransfer.items ? event.dataTransfer.items : [];
            if (effectAllowed === "all" || effectAllowed === "uninitialized") {
                if (this._verifyFileType(Array.prototype.slice.call(dataTransferItems))) {
                    this.setState({draggingOverTargetAccept: true});
                } else {
                    this.setState({draggingOverTargetReject: true});
                }
            }

            if (this.props.onDragOver) this.props.onDragOver(event);
        },

        _handleDragLeave: function (event) {
            this.setState({draggingOverTargetAccept: false, draggingOverTargetReject: false});
            if (this.props.onDragLeave) this.props.onDragLeave(event);
        },

        _handleFrameDrag: function (event) {
            // We are listening for events on the 'frame', so every time the user drags over any element in the frame's tree,
            // the event bubbles up to the frame. By keeping count of how many "dragenters" we get, we can tell if they are still
            // "draggingOverFrame" (b/c you get one "dragenter" initially, and one "dragenter"/one "dragleave" for every bubble)
            this._dragCount += (event.type === "dragenter" ? 1 : -1);
            if (this._dragCount === 1) {
                this.setState({draggingOverFrame: true});
                if (this.props.onFrameDragEnter) this.props.onFrameDragEnter(event);
            } else if (this._dragCount === 0) {
                if (this.props.onFrameDragLeave) this.props.onFrameDragLeave(event);
                this.setState({draggingOverFrame: false});
            }
        },

        _handleFrameDrop: function(event) {
            this.resetDragging();
            if (!this.state.draggingOverTargetAccept && !this.state.draggingOverTargetReject) {
                if (this.props.onFrameDrop) this.props.onFrameDrop(event);
            }
        },

        render: function () {
            var fileDropTarget;
            var fileDropTargetClassName = "file-drop-target";
            if (this.props.targetAlwaysVisible || this.state.draggingOverFrame) {
                if (this.state.draggingOverFrame) fileDropTargetClassName += " file-drop-dragging-over-frame";
                if (this.state.draggingOverTargetAccept) fileDropTargetClassName += " file-drop-dragging-over-target-accept";
                if (this.state.draggingOverTargetReject) fileDropTargetClassName += " file-drop-dragging-over-target-reject";
                fileDropTarget = (
                    React.createElement("div", {className: fileDropTargetClassName},
                        this.props.children
                    )
                );
            }
            var className = "file-drop";
            if (this.props.className) {
                className += " " + this.props.className;
            }
            return (
                React.createElement("div", {className: className, onDrop: this._handleDrop, onDragLeave: this._handleDragLeave, onDragOver: this._handleDragOver},
                    fileDropTarget
                )
            );
        },

        _handleWindowDragOverOrDrop: function(event) {
            event.preventDefault();
        },

        componentWillReceiveProps: function(nextProps) {
            if (nextProps.frame !== this.props.frame) {
                this.resetDragging();
                this.stopFrameListeners(this.props.frame);
                this.startFrameListeners(nextProps.frame);
            }
        },

        componentWillMount: function() {
            this.startFrameListeners();
            this.resetDragging();
            window.addEventListener("dragover", this._handleWindowDragOverOrDrop);
            window.addEventListener("drop", this._handleWindowDragOverOrDrop);
        },

        componentWillUnmount: function() {
            this.stopFrameListeners();
            window.removeEventListener("dragover", this._handleWindowDragOverOrDrop);
            window.removeEventListener("drop", this._handleWindowDragOverOrDrop);
        },

        stopFrameListeners: function(frame) {
            frame = frame || this.props.frame;
            frame.removeEventListener("dragenter", this._handleFrameDrag);
            frame.removeEventListener("dragleave", this._handleFrameDrag);
            frame.removeEventListener("drop", this._handleFrameDrop);
        },

        startFrameListeners: function(frame) {
            frame = frame || this.props.frame;
            frame.addEventListener("dragenter", this._handleFrameDrag);
            frame.addEventListener("dragleave", this._handleFrameDrag);
            frame.addEventListener("drop", this._handleFrameDrop);
        }
    });

    if (typeof exports === "undefined" && typeof define !== "function" && !this.ReactFileDrop) {
        this.ReactFileDrop = FileDrop;
    }

    return FileDrop;
}));
