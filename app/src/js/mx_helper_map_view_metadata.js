/**
 * Get view's source metadata
 * @param {String} id Name/Id of the source layer
 */
export function getSourceMetadata(id, force) {
  const urlSourceMeta = mx.helpers.getApiUrl('getSourceMetadata');

  return new Promise((resolve, reject) => {
    if (!id) {
      return reject('missing id');
    }

    force = force || false;
    const url = urlSourceMeta + id + '?date=' + performance.now();

    resolve(url);
  })
    .then(fetch)
    .then((meta) => meta.json())
    .then((meta) => {
      return meta;
    });
}

/**
 * Get view metadata
 * @param {String} id Name/Id of the view
 */
export function getViewMetadata(id, force) {
  const urlViewMeta = mx.helpers.getApiUrl('getViewMetadata');

  return new Promise((resolve, reject) => {
    if (!id) {
      return reject('missing id');
    }

    force = force || false;
    const url = urlViewMeta + id + '?date=' + performance.now();

    resolve(url);
  })
    .then(fetch)
    .then((meta) => meta.json())
    .then((meta) => {
      return meta;
    });
}

/**
 * Add source meta object to given view
 * @param {Obejct} view object
 * @param {Boolean} force force / replace meta object
 */
export function addSourceMetadataToView(opt) {
  opt = opt || {};
  const view = opt.view || {};
  const force = opt.forceUpdateMeta || false;
  const idSourceLayer = mx.helpers.path(view, 'data.source.layerInfo.name', '');
  const empty = {};

  if (!idSourceLayer) {
    return Promise.resolve(empty);
  }

  if (view._meta && !force) {
    return Promise.resolve(view._meta);
  }

  return mx.helpers.getSourceMetadata(idSourceLayer, force).then((meta) => {
    /**
     * Save meta in view
     */
    if (meta && meta.text) {
      view._meta = meta;
      return meta;
    } else {
      return empty;
    }
  });
}

export function viewToMetaModal(view) {
  const h = mx.helpers;
  const el = h.el;
  const id = h.isView(view) ? view.id : view;
  view = mx.helpers.getView(id);
  const meta = {};
  const metaRasterLink = h.path(view, 'data.source.urlMetadata');

  getViewMetadata(id, true).then((data) => {
    const elContent = el('div');

    if (data.meta) {
      Object.assign(meta,data.meta);
    }
    meta.id = id;

    const elViewMeta = metaViewToUi(meta);

    if (elViewMeta) {
      elContent.appendChild(elViewMeta);
    }

    if (metaRasterLink) {
      const elRasterMetaLink = metaSourceRasterToUi({
        url: metaRasterLink
      });
      if (elRasterMetaLink) {
        elContent.appendChild(elRasterMetaLink);
      }
    }

    if ( view.type === 'vt' && view._meta) {
      const sourceMeta = view._meta;
      const elSourceMeta = metaSourceToUi(sourceMeta);
      const elDiafTable = metaSourceToDiafUi(sourceMeta);
      const elDiafSummary = metaSourceToDiafSummary(sourceMeta);

      if (elDiafSummary) {
        elContent.appendChild(elDiafSummary);
      }

      if (elSourceMeta) {
        elContent.appendChild(elSourceMeta);
      }

      if (elDiafTable) {
        elContent.appendChild(elDiafTable);
      }
    }

    const elTitleModal = el('span', {
      dataset: {
        lang_key: 'meta_view_modal_title'
      }
    });

    const elModal = h.modal({
      title: elTitleModal,
      content: elContent
    });

    h.updateLanguageElements({
      el: elModal
    });
  });
}

export function metaSourceRasterToUi(rasterMeta) {
  const h = mx.helpers;
  const el = h.el;

  rasterMeta = rasterMeta || {};

  if (!h.isUrl(rasterMeta.url)) {
    return el("div");
  }

  rasterMeta = h.objectToArray(
    {
      meta_view_raster_meta: rasterMeta.url
    },
    true
  );

  return h.elAuto('array_table', rasterMeta, {
    render: 'array_table',
    tableHeadersSkip: true,
    tableTitle: 'meta_view_raster_meta',
    tableTitleAsLanguageKey: true,
    stringAsLanguageKey: true,
    urlDefaultLabel: 'Link'
  });

}

export function metaSourceToDiafSummary(meta) {
  const h = mx.helpers;
  const el = h.el;

  if (!h.isObject(meta) || !h.isObject(meta.integrity)) {
    return el('div');
  }

  const score = h.getDiafScoreFromIntegrity(meta.integrity);

  const summary = h.objectToArray(
    {
      score: Math.round(score.score * 10000) / 100,
      yes: score.yes,
      no: score.no,
      partial: score.part,
      dont_know: score.unknown
    },
    true
  );

  const elOut = h.elAuto('array_table', summary, {
    render: 'array_table',
    tableHeadersSkip: true,
    tableTitle: 'meta_view_diaf_summary_title',
    tableTitleAsLanguageKey: true,
    stringAsLanguageKey: true
  });

  return elOut;
}

export function metaSourceToDiafUi(meta) {
  const h = mx.helpers;
  const el = h.el;

  if (!h.isObject(meta) || !h.isObject(meta.integrity)) {
    return el('div');
  }

  const diaf = meta.integrity;
  const idsDiaf = Object.keys(diaf);
  let diItem;

  const ans = {
    '0': 'dont_know',
    '1': 'no',
    '2': 'partial',
    '3': 'yes'
  };
  const desc = function(id) {
    return id + '_desc';
  };

  const elDescBlock = el('span', {
    dataset: {
      lang_key: 'data_integrity_desc'
    }
  });

  const elTableDiaf = el(
    'table',
    {
      class: 'table'
    },
    el(
      'thead',
      el(
        'tr',
        el('th', {
          scope: 'col',
          dataset: {
            lang_key: 'data_integrity_table_key'
          }
        }),
        el('th', {
          scope: 'col',
          class: 'col-md-3',
          dataset: {
            lang_key: 'data_integrity_table_value'
          }
        })
      )
    ),
    el(
      'tbody',
      {
        class: 'table-striped'
      },
      idsDiaf.map((id) => {
        diItem = diaf[id];
        return el(
          'tr',
          el(
            'td',
            el(
              'div',
              el('bold', {
                dataset: {
                  lang_key: id
                }
              }),
              el('p', {
                class: 'text-muted',
                dataset: {
                  lang_key: desc(id)
                }
              })
            )
          ),
          el('td', {
            class: 'col-33',
            dataset: {
              lang_key: ans[diItem]
            }
          })
        );
      })
    )
  );

  return el(
    'div',
    {
      class: ['panel', 'panel-default']
    },
    el(
      'div',
      {
        class: ['panel-heading']
      },
      elDescBlock
    ),
    elTableDiaf
  );

}

function metaViewToUi(meta) {
  const h = mx.helpers;
  const el = h.el;
  const elAuto = h.elAuto;
  const prefixKey = 'meta_view_';
  const keys = [
    'project_title',
    'projects_titles',
    'classes',
    'collections',
    'readers',
    'editors',
    'stat_n_add',
    'stat_n_distinct_user',
    'date_modified',
    'date_created',
    'id'
  ];

  let tblSummary = h.objectToArray(meta, true);

  tblSummary = tblSummary
    .filter((row) => keys.indexOf(row.key) > -1)
    .sort((a, b) => {
      return keys.indexOf(a.key) - keys.indexOf(b.key);
    })
    .map((row) => {
      row.key = prefixKey + row.key; // to match dict labels
      return row;
    });

  return el(
    'div',
    elAuto('array_table', tblSummary, {
      render: 'array_table',
      tableHeadersSkip: true,
      tableTitle: 'meta_view_table_summary_title',
      tableTitleAsLanguageKey: true,
      stringAsLanguageKey: true
    }),
    elAuto('array_table', meta.table_editors, {
      booleanValues: ['✓', ''],
      tableHeadersClasses: ['col-sm-6', 'col-sm-3', 'col-sm-3'],
      tableTitleAsLanguageKey: true,
      tableHeadersLabels: [
        'meta_view_table_editors_email',
        'meta_view_table_editors_changes',
        'meta_view_table_editors_current'
      ],
      tableTitle: 'meta_view_table_editors_title'
    })
  );
}

/**
 * Vector source meta data to UI
 */
export function metaSourceToUi(meta) {
  const h = mx.helpers;
  const el = h.el;
  const elAuto = h.elAuto;
  const glfo = h.getLabelFromObjectPath;
  const oToA = h.objectToArray;

  /**
  * Path to meta object
  */
  const p = function(p, d) {
    return h.path(meta, p, d);
  };
  /**
  * Label from object path
  */
  const lfo = function(o, d, p) {
    return glfo({
      obj: o,
      path: p,
      default: d
    });
  };
  const l = function(p, d) {
    return lfo(meta, d, p);
  };

  /**
   * Attributes table
   */
  const tblAttributesRaw = oToA(p('text.attributes', {}), true);
  const attrAlias = p('text.attributes_alias', {});
  const tblAttributes = tblAttributesRaw.map((r) => {
    r.key = el(
      'div',
      el('h5', lfo(attrAlias[r.key], r.key)),
      el('span', {class: ['text-muted']}, r.key)
    );
    r.value = lfo(r.value);
    return r;
  });
  const elTblAttributes = elAuto('array_table', tblAttributes, {
    tableHeadersSkip: true,
    tableTitleAsLanguageKey: true,
    tableTitle: 'attributes_desc_title'
  });

  const urlHomepage = p('origin.homepage.url', '');
  const urlSources = p('origin.source.urls', []).map((d) => d.url);
  const urlAnnexes = p('annex.references', []).map((d) => d.url);
  const hasHomepage = h.isUrl(urlHomepage);

  const elHomepage = hasHomepage
    ? el(
        'a',
        {
          target: '_blank',
          href: urlHomepage
        },
        'Link'
      )
    : el('span');

  const elSourceUrl = el(
    'ul',
    urlSources.map((url) => {
      if (!h.isUrl(url)) {
        return;
      }
      let hostname = (new URL(url)).hostname;
      return el(
        'li',
        el(
          'a',
          {
            target: '_blank',
            href: url
          },
          hostname
        )
      );
    })
  );
const elAnnexesUrl = el(
    'ul',
    urlAnnexes.map((url) => {
      if (!h.isUrl(url)) {
        return;
      }
      let hostname = (new URL(url)).hostname;
      return el(
        'li',
        el(
          'a',
          {
            target: '_blank',
            href: url
          },
          hostname
        )
      );
    })
  );

  const elTitle = el('span', l('text.title'));

  const elAbstract = el('p', l('text.abstract', '-'));
  const elNotes = el('p', l('text.notes', '-'));
  const elKeywords = elAuto('array_string', p('text.keywords.keys', ['-']));
  const elLanguages = elAuto(
    'array_string',
    p('text.language.codes', []).map((l) => l.code),
    {
      stringAsLanguageKey: true
    }
  );
  const elContacts = el(
    'ul',
    p('contact.contacts', []).map((c) => {
      return el(
        'li',
        el(
          'a',
          {
            href: 'mailto:' + c.email
          },
          el('div', el('span', c.name + (c.function?(' ( ' + c.function + ' ) '):'')))
        ),
        el(
          'span',
          {
            class: 'text-muted'
          },
          c.address
        )
      );
    })
  );
  const elPeriodicity = elAuto('string', p('temporal.issuance.periodicity'), {
    stringAsLanguageKey: true
  });
  const elReleasedAt = elAuto('date', p('temporal.issuance.released_at', null));
  const elModifiedAt = elAuto('date', p('temporal.issuance.modified_at', null));
  const elIsTimeless = elAuto('boolean', p('temporal.range.is_timeless', null), {
    booleanValues: ['yes', 'no'],
    stringAsLanguageKey: true
  });
  const elStartAt = elAuto('date', p('temporal.range.start_at', null));

  const elEndAt = elAuto('date', p('temporal.range.end_at', null));
  const elId = el('span', p('_id_source'));
  /**
   * Summary table
   */
  const tblSummary = oToA(
    {
      title: elTitle,
      abstract: elAbstract,
      notes: elNotes,
      keywords: elKeywords,
      languages: elLanguages,
      contacts: elContacts,
      homepage: elHomepage,
      url_download: elSourceUrl,
      url_annexes: elAnnexesUrl,
      periodicity: elPeriodicity,
      released_at: elReleasedAt,
      modified_at: elModifiedAt,
      is_timeless: elIsTimeless,
      start_at: elStartAt,
      end_at: elEndAt,
      id: elId
    },
    // make an array of object
    true
  );

  const elTblSummary = elAuto('array_table', tblSummary, {
    tableHeadersSkip: true,
    tableTitleAsLanguageKey: true,
    tableTitle: 'table_summary_title', // will be prefixed
    langKeyPrefix: 'meta_source_',
    stringAsLanguageKey: true
  });

  const elMeta = el('div', elTblSummary, elTblAttributes);

  return elMeta;
}
