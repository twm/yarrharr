import React from 'react';
import PropTypes from 'prop-types';
import { Remove } from 'widgets/icons.js';
import { LabelLink } from 'widgets/links.js';
import { FILTER_UNREAD } from '../actions.js';
import "./Label.less";

const __debug__ = process.env.NODE_ENV !== 'production';

/**
 * <Label> displays the name of a label and a button which can be used to
 * detach it from the feed.
 */
export class Label extends React.PureComponent {
    render() {
        return <LabelLink labelId={this.props.label.id} filter={FILTER_UNREAD}>
            <span className="label">{this.props.label.text}</span>
        </LabelLink>;
    }
}

if (__debug__) {
    Label.propTypes = {
        feedId: PropTypes.number.isRequired,
        label: PropTypes.shape({
            id: PropTypes.number.isRequired,
            text: PropTypes.string.isRequired,
        }).isRequired,
    };
}


/**
 * LabelSelector presents a checkbox for each label.
 */
export class LabelSelector extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleAdd = this.handleAdd.bind(this);
    }
    render() {
        const feed = this.props.feed;
        return <div className="label-selector">
            {this.props.labelList.map(label =>
                <LabelCheckbox key={label.id} feed={feed} label={label}
                    onAttachLabel={this.props.onAttachLabel}
                    onDetachLabel={this.props.onDetachLabel} />)}
            <a href="#" className="text-button" role="button" onClick={this.handleAdd}>New Label</a>
        </div>;
    }
    handleAdd(event) {
        event.preventDefault();
        event.stopPropagation();
        var text = prompt("Label Name:", "");
        if (text) {
            this.props.onAddLabel(text);
        }
    }
}

class LabelCheckbox extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleClick = event => {
            if (event.target.checked) {
                this.props.onAttachLabel(this.props.feed.id, this.props.label.id);
            } else {
                this.props.onDetachLabel(this.props.feed.id, this.props.label.id);
            }
        };
    }
    render() {
        return <label key={this.props.label.id}>
            <input type="checkbox" onChange={this.handleClick}
                checked={this.props.feed.labels.indexOf(this.props.label.id) >= 0} />
            <span className="label">{this.props.label.text}</span>
        </label>;
    }
}

if (__debug__) {
    LabelSelector.propTypes = {
        labelList: PropTypes.array.isRequired,
        feed: PropTypes.shape({
            id: PropTypes.number.isRequired,
            labels: PropTypes.arrayOf(PropTypes.number.isRequired).isRequired,
        }).isRequired,
        // Will be called with the text of the label to add.
        onAddLabel: PropTypes.func.isRequired,
        // Will be called with the feedId and labelId to associate it with.
        onAttachLabel: PropTypes.func.isRequired,
        // Will be called when the feedId and labelId to disassociate.
        onDetachLabel: PropTypes.func.isRequired,
    };
}

export class AttachLabelButton extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {open: false};
        this.handleClick = (event) => {
            this.setState({open: !this.state.open});
            event.preventDefault();
        };
        this.handleClose = event => {
            this.setState({open: false});
        };
    }
    render() {
        return <span>
            <a className="label-attach" role="button" href="#" title="Attach Label" onClick={this.handleClick}> + </a>
            {this.state.open
                ? <LabelPicker {...this.props} onClose={this.handleClose} />
                : null}
        </span>;
    }
}

if (__debug__) {
    AttachLabelButton.propTypes = {
        labelList: PropTypes.array.isRequired,
        feed: PropTypes.shape({
            id: PropTypes.number.isRequired,
            labels: PropTypes.arrayOf(PropTypes.number.isRequired).isRequired,
        }).isRequired,
        // Will be called with the text of the label to add.
        onAddLabel: PropTypes.func.isRequired,
        // Will be called with the feedId and labelId to associate it with.
        onAttachLabel: PropTypes.func.isRequired,
    };
}

export class LabelPicker extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleAdd = this.handleAdd.bind(this);
        this.handleClose = this.handleClose.bind(this);
    }
    unappliedLabels() {
        return this.props.labelList.filter(function(label) {
            return this.props.feed.labels.indexOf(label.id) < 0;
        }, this);
    }
    render() {
        const feed = this.props.feed;
        return <div className="label-picker-backdrop" onClick={this.handleClose}>
            <section className="label-picker" onClick={this.stopClickPropagation}>
                <header>
                    <h1>Select label for {feed.text || feed.title || feed.url}:</h1>
                    <a className="cancel" title="Close" role="button" href="#" onClick={this.handleClose}><Remove alt=" × " /></a>
                </header>
                <div className="center">
                    {this.unappliedLabels().map(label =>
                        <LabelPickButton key={label.id} label={label} feed={this.props.feed} onAttachLabel={this.props.onAttachLabel} />)}
                </div>
                <footer>
                    <a role="button" href="#" className="create text-button" onClick={this.handleAdd}>New Label</a>
                </footer>
            </section>
        </div>;
    }
    handleAdd(event) {
        event.preventDefault();
        event.stopPropagation();
        var text = prompt("Label Name:", "");
        if (text) {
            this.props.onAddLabel(text);
        }
    }
    /**
     * A label was clicked.  Call the associated callback.
     */
    handleLabelClick(label) {
        this.props.onAttachLabel(this.props.feed.id, label.id);
    }
    /**
     * Stop propagation of the click event so that it isn't handled by the
     * backdrop.
     */
    stopClickPropagation(event) {
        event.stopPropagation();
    }
    handleClose(event) {
        event.preventDefault();
        this.props.onClose();
    }
    componentDidMount() {
        // TODO: Focus the first button
    }
}

class LabelPickButton extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleClick = event => {
            event.preventDefault();
            this.props.onAttachLabel(this.props.feed.id, this.props.label.id);
        };
    }
    render() {
        return <a role="button" href="#" onClick={this.handleClick}>{this.props.label.text}</a>;
    }
}

if (__debug__) {
    LabelPicker.propTypes = {
        // Feed object
        feed: PropTypes.shape({
            text: PropTypes.string.isRequired,
            labels: PropTypes.arrayOf(PropTypes.number).isRequired,
        }).isRequired,
        // All available labels (only those not associated with the feed will be shown).
        labelList: PropTypes.arrayOf(PropTypes.object).isRequired,
        // Will be called with the text of the label to add.
        onAddLabel: PropTypes.func.isRequired,
        // Will be called with the feed and label to associate it with.
        onAttachLabel: PropTypes.func.isRequired,
        // Called with no arguments when the dialog is to be closed.
        onClose: PropTypes.func.isRequired,
    };
}
