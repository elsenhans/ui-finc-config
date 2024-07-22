import { get } from 'lodash';
import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import { useQuery } from 'react-query';
import { generateKiwtQueryParams, useKiwtSASQuery } from '@k-int/stripes-kint-components';

import { useOkapiKy, useStripes } from '@folio/stripes/core';
import { Layout } from '@folio/stripes/components';

import MetadataCollections from '../components/MetadataCollections/MetadataCollections';
// import filterConfig from '../components/MetadataCollections/filterConfigData';
import urls from '../components/DisplayUtils/urls';

const INITIAL_RESULT_COUNT = 30;
// const RESULT_COUNT_INCREMENT = 30;

const CollectionsRoute = ({
  children,
  history,
  location,
  match,
}) => {
  const ky = useOkapiKy();
  const stripes = useStripes();
  const hasPerms = stripes.hasPerm('finc-config.metadata-collections.collection.get');
  const searchField = useRef();

  useEffect(() => {
    if (searchField.current) {
      searchField.current.focus();
    }
  }, []);

  const { query, queryGetter, querySetter } = useKiwtSASQuery();

  const collectionsQueryParams = useMemo(() => (
    generateKiwtQueryParams({
      searchKey: 'label.value,description.value,collectionId.value',
      filterKeys: {
        metadataAvailable: 'metadataAvailable.value',
        usageRestricted: 'usageRestricted.value',
        freeContent: 'freeContent.value',
      },
      // page: currentPage,
      perPage: INITIAL_RESULT_COUNT
    }, (query ?? {}))
  ), [query]);


  const MDSOURCES_API = 'finc-config/tiny-metadata-sources';
  const COLLECTIONS_API = 'finc-config/metadata-collections';

  const useMdSources = () => {
    const { isLoading, data: mdSources = [], ...rest } = useQuery(
      [MDSOURCES_API],
      () => ky.get(`${MDSOURCES_API}`).json(),
    );

    return ({
      isLoading,
      mdSources,
      ...rest,
    });
  };

  const {
    data: { fincConfigMetadataCollections: collections = [], totalRecords: collectionsCount = 0 } = {},
    error: collectionsError,
    isLoading: areCollectionsLoading,
    isError: isCollectionsError
  } = useQuery(
    ['fincConfigMetadataCollections', collectionsQueryParams, COLLECTIONS_API],
    () => {
      const params = [...collectionsQueryParams];
      return ky.get(`${COLLECTIONS_API}?${params?.join('&')}`).json();
    }
  );

  useEffect(() => {
    if (collectionsCount === 1) {
      history.push(`${urls.collectionView(collections[0].id)}${location.search}`);
    }
  }, [collections, collectionsCount, history, location.search]);

  const { mdSources, isLoading: isLoadingMdSources } = useMdSources();

  if (!hasPerms) {
    return (
      <Layout className="textCentered">
        <h2><FormattedMessage id="stripes-smart-components.permissionError" /></h2>
        <p><FormattedMessage id="stripes-smart-components.permissionsDoNotAllowAccess" /></p>
      </Layout>
    );
  }

  return (
    <MetadataCollections
      contentData={!areCollectionsLoading ? collections : []}
      // collection={collections}
      filterData={!isLoadingMdSources ? { mdSources: get(mdSources, 'tinyMetadataSources', []) } : { mdSources: [] }}
      // onNeedMoreData={handleNeedMoreData}
      queryGetter={queryGetter}
      querySetter={querySetter}
      searchString={location.search}
      selectedRecordId={match.params.id}
      searchField={searchField}
      // add values for search-selectbox
      // onChangeIndex={onChangeIndex}
      source={{ // Fake source from useQuery return values;
        totalCount: () => collectionsCount,
        loaded: () => !areCollectionsLoading,
        pending: () => areCollectionsLoading,
        failure: () => isCollectionsError,
        failureMessage: () => collectionsError.message
      }}
    >
      {children}
    </MetadataCollections>
  );
};

CollectionsRoute.propTypes = {
  children: PropTypes.node,
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
  location: PropTypes.shape({
    search: PropTypes.string,
  }).isRequired,
  match: PropTypes.shape({
    params: PropTypes.shape({
      id: PropTypes.string,
    }),
  }),
};

export default CollectionsRoute;
