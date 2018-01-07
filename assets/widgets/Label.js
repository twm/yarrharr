import React from 'react';
import PropTypes from 'prop-types';
import { LabelLink } from 'widgets/links.js';
import { FILTER_UNREAD } from '../actions.js';
import "./Label.less";

const __debug__ = process.env.NODE_ENV !== 'production';

/**
 * <Label> displays the name of a label as a link to that label's view.
 */
export class Label extends React.PureComponent {
    render() {
        return <LabelLink labelId={this.props.label.id} filter={FILTER_UNREAD}>
            {this.props.label.text}
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
            {this.props.label.text}
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
