import React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'react-redux';
import { Title } from 'widgets/Title.jsm';
import { LabelIcon, FeedIcon, ArrowLeftIcon, ArrowRightIcon, OutboundIcon, EditIcon, WideIcon, NarrowIcon, AscDescIcon } from 'widgets/icons.js';
import { RootLink, InventoryLink, LabelListLink, AddFeedLink } from 'widgets/links.js';
import Heart from 'icons/heart-empty.svg';
import './debug.less';

import { Tabs } from 'widgets/Tabs.js';
import { GlobalBar } from 'widgets/GlobalBar.js';

class DebugView extends React.PureComponent {
    render() {
        return <React.Fragment>
            <GlobalBar />
            <Title title="Debug" />
            <Tabs>
                <RootLink className="no-underline">Home</RootLink>
                <InventoryLink className="no-underline">Feeds</InventoryLink>
                <LabelListLink className="no-underline">Labels</LabelListLink>
                <AddFeedLink className="no-underline">Add Feed</AddFeedLink>
            </Tabs>
            <div className="debug-icons">
                <h2>Icons</h2>
                <p>
                    Label <LabelIcon />
                    Feed <FeedIcon />
                    Left <ArrowLeftIcon />
                    Right <ArrowRightIcon />
                    Outbound <OutboundIcon />
                    Edit <EditIcon />
                    Wide <WideIcon />
                    Narrow <NarrowIcon />
                    Ascending <AscDescIcon ascending={true} />
                    Descending <AscDescIcon ascending={false} />
                </p>
                <p>
                    <LabelIcon className="icon debug-icon-grid" />
                    <FeedIcon className="icon debug-icon-grid" />
                    <ArrowLeftIcon className="icon debug-icon-grid" />
                    <ArrowRightIcon className="icon debug-icon-grid" />
                    <OutboundIcon className="icon debug-icon-grid" />
                    <EditIcon className="icon debug-icon-grid" />
                    <WideIcon className="icon debug-icon-grid" />
                    <NarrowIcon className="icon debug-icon-grid" />
                    <AscDescIcon ascending={true} className="icon debug-icon-grid" />
                    <AscDescIcon ascending={false} className="icon debug-icon-grid" />
                </p>
            </div>
        </React.Fragment>;
    }
}

export const ConnectedDebugView = connect(state => state)(DebugView);
