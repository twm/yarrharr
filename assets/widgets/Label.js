import React from 'react';
import PropTypes from 'prop-types';
import { Remove } from 'widgets/icons.js';
import "./Label.less";

const __debug__ = process.env.NODE_ENV !== 'production';

/**
 * <Label> displays the name of a label. If the optional onDetach prop is
 * provided, it also allows removal of the label.
 */
export class Label extends React.PureComponent {
    render() {
        return <span className="label">
            <span className="label-text">{this.props.label.text}</span>
            {this.props.onDetach ? <a className="label-x" role="button" href="#" onClick={this.props.onDetach}> × </a> : null}
        </span>;
    }
}

if (__debug__) {
    Label.propTypes = {
        label: PropTypes.shape({
            text: PropTypes.string.isRequired,
        }).isRequired,
        onDetach: PropTypes.func,
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
    }
    render() {
        return <span>
            <a className="label-attach" role="button" href="#" title="Attach Label" onClick={this.handleClick}> + </a>
            {this.state.open
                ? <LabelPicker
                    {...this.props}
                    onCancel={() => this.setState({open: false})}
                    />
                : null}
        </span>;
    }
}

if (__debug__) {
    AttachLabelButton.propTypes = {
        labelList: PropTypes.array.isRequired,
        feed: PropTypes.object.isRequired,
        // Will be called with the text of the label to add.
        onAddLabel: PropTypes.func.isRequired,
        // Will be called with the feed and label to associate it with.
        onLabelPick: PropTypes.func.isRequired,
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
                        <LabelPickButton key={label.id} label={label} feed={this.props.feed} onLabelPick={this.props.onLabelPick} />)}
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
        this.props.onLabelPick(this.props.feed, label);
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
        this.props.onCancel();
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
            this.props.onLabelPick(this.props.feed, this.props.label);
        };
    }
    render() {
        return <a role="button" href="#" onClick={this.handleClick}>{this.props.label.text}</a>;
    }
}

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
    onLabelPick: PropTypes.func.isRequired,
    // Called with no arguments when the dialog is closed.
    onCancel: PropTypes.func.isRequired,
};
