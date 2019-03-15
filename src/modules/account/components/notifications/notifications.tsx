import React from "react";
import { isEqual } from "lodash";

import NotificationBox from "modules/account/components/notifications/notification-box";
import { Notifications as INotifications } from "modules/account/types";
import {
  FinalizeTemplate,
  OpenOrdersResolvedMarketsTemplate,
  ReportEndingSoonTemplate,
  DisputeTemplate,
  SellCompleteSetTemplate,
  ClaimReportingFeesTemplate,
  UnsignedOrdersTemplate,
  ProceedsToClaimTemplate
} from "modules/account/components/notifications/notifications-templates";

import * as constants from "modules/common-elements/constants";

export interface NotificationsProps {
  notifications: Array<INotifications>;
  updateNotifications: Function;
  getReportingFees: Function;
  currentAugurTimestamp: number;
  reportingWindowStatsEndTime: number;
  sellCompleteSetsModal: Function;
  finalizeMarketModal: Function;
  claimTradingProceeds: Function;
}

const {
  resolvedMarketsOpenOrders,
  reportOnMarkets,
  finalizeMarkets,
  marketsInDispute,
  completeSetPositions,
  unsignedOrders,
  claimReportingFees,
  proceedsToClaim
} = constants.NOTIFICATION_TYPES;

class Notifications extends React.Component<NotificationsProps> {
  componentDidMount() {
    this.props.updateNotifications(this.props.notifications);
    this.props.getReportingFees();
  }

  componentWillReceiveProps(nextProps: NotificationsProps) {
    if (!isEqual(this.props.notifications, nextProps.notifications)) {
      this.props.updateNotifications(nextProps.notifications);
      this.props.getReportingFees();
    }
  }

  render() {
    const notifications = this.props.notifications.map(notificaction => {
      let options = {};
      if (notificaction.type === resolvedMarketsOpenOrders) {
        options = {
          buttonAction: () => null,
          Template: OpenOrdersResolvedMarketsTemplate
        };
      } else if (notificaction.type === reportOnMarkets) {
        options = {
          buttonAction: () => null,
          Template: ReportEndingSoonTemplate
        };
      } else if (notificaction.type === finalizeMarkets) {
        options = {
          buttonAction: () =>
            this.props.finalizeMarketModal(notificaction.market.id),
          Template: FinalizeTemplate
        };
      } else if (notificaction.type === marketsInDispute) {
        options = {
          buttonAction: () => null,
          Template: DisputeTemplate
        };
      } else if (notificaction.type === completeSetPositions) {
        options = {
          buttonAction: () =>
            this.props.sellCompleteSetsModal(
              notificaction.market.id,
              notificaction.market.myPositionsSummary.numCompleteSets
            ),
          Template: SellCompleteSetTemplate
        };
      } else if (notificaction.type === unsignedOrders) {
        options = {
          buttonAction: () => null,
          Template: UnsignedOrdersTemplate
        };
      } else if (notificaction.type === claimReportingFees) {
        options = {
          buttonAction: () => null,
          Template: ClaimReportingFeesTemplate
        };
      } else if (notificaction.type === proceedsToClaim) {
        options = {
          buttonAction: () => this.props.claimTradingProceeds(),
          Template: ProceedsToClaimTemplate
        };
      }

      return {
        ...notificaction,
        ...options
      };
    });

    return (
      <NotificationBox
        notifications={notifications}
        currentTime={this.props.currentAugurTimestamp}
        reportingWindowEndtime={this.props.reportingWindowStatsEndTime}
      />
    );
  }
}

export default Notifications;