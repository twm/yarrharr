import React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'react-redux';
import { Title } from 'widgets/Title.jsm';
import { GlobeIcon, LabelIcon, FeedIcon } from 'widgets/icons.js';
import { AllLink, FeedLink, LabelLink } from 'widgets/links.js';
import { GlobalBar } from 'widgets/GlobalBar.js';
import './HomeView.less';



function HomeView({feedCount, labelCount}) {
    return <React.Fragment>
        <GlobalBar />
        <Title title="Home" />
        <div className="root">
            <h1>Home</h1>
            <p>{labelCount} labels</p>
            <p>{feedCount} feeds</p>
        </div>
    </React.Fragment>;
}

if (__debug__) {
    HomeView.propTypes = {
        labelCount: PropTypes.number.isRequired,
        feedCount: PropTypes.number.isRequired,
    };
}

export default connect(
    state => {
        return {
            feedCount: state.feedOrder.length,
            labelCount: state.labelOrder.length,
        };
    }
)(HomeView);
