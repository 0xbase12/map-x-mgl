/* jshint evil:true, esversion:6  */


/*
* Update all badges at once
* @param {Object} o Options
* @param {Boolean} o.forceUpdateMeta force metadata remote fetching
*/
export function updateViewsBadges(o){
  o = o || {};
  const forceUpdateMeta = o.forceUpdateMeta || false;
  const h = mx.helpers;
  const views = h.getViews();
  views.forEach(v => {
    //mx.helpers.onNextFrame(()=>{
    setTimeout(()=>{
      mx.helpers.setViewBadges({
        view : v,
        forceUpdateMeta : forceUpdateMeta
      });
    },500);
  });
}

/*
* Update a sinfle view badges
* @param {Object} o Options
* @param {Boolean} o.forceUpdateMeta force metadata remote fetching
* @param {Object} o.view View to which add badges
*/
export function setViewBadges(opt){

  opt = opt || {};
  
  const h = mx.helpers;
  const view = opt.view || {};
  const elBadges = document.createElement("div");
  const readers = view.readers || [];
  const hasEdit = view._edit === true;
  const isValidable = view.type === "rt" || view.type === "vt";
  const hasDiaf = view.type === "vt";
  const hasPublic = readers.indexOf("public") > -1;
  const isShared = view.project !== mx.settings.project;
  const elViewBadgesContainer =  document.getElementById("view_badges_" + view.id);
  if(!elViewBadgesContainer){
    return;
  }
  elViewBadgesContainer.innerHTML = "";
  elViewBadgesContainer.appendChild(elBadges);
  elBadges.classList.add("mx-view-badges");

  if( hasPublic ){

    /**
     * Add public Badge
     */
    addBadgePublic({
      elBadges : elBadges
    });

   }

    /**
     * Check if it's valid, add the validate badge
     */
  if( isValidable ){

    /**
     * Validate asynchronously metadata
     */
    h.validateMetadataView({
      view : view,
      forceUpdateMeta : opt.forceUpdateMeta
    })
      .then( validation => {
        if( hasPublic ){
          if( ! validation.valid ){

            /**
             * Add not valid badge
             */
            addBadgePublicNotValid({
              elBadges : elBadges,
              validation : validation
            });

          }else if(hasDiaf){

            if( hasPublic ){
              /**
               * Validation passed. Test DIAF
               */
              addBadgeDiaf({
                elBadges : elBadges,
                view : view
              });
            }
          }
        }
      })
      .then(()=>{
        /**
         * Update languages
         */
        h.updateLanguageElements({
          el: elBadges
        });

      });
  }

  if( isShared ){ 

    /**
     * Add shared badge
     */
    addBadgeShared({
      elBadges : elBadges
    });
  }

  /**
   * Add editable badge:
   * lock open or closed
   */
  addBadgeEdit({
    elBadges : elBadges,
    viewEditable : hasEdit
  });

  /**
  * Update languages
  */
  h.updateLanguageElements({
    el: elBadges
  });

}


/**
 * Helpers
 */

/**
 * Add public badge
 */
function addBadgePublic(opt){
  const elBadges = opt.elBadges;

  const elBadge  = createViewBadge({
    iconClasses : ["mx-view-public-valid","fa","fa-check-circle"],
    tooltipClasses : ["hint--left"],
    tooltipKey : "view_public_valid"
  });
  elBadges.appendChild(elBadge);

}

/**
 * Add editor / lock badge
 */
function addBadgeEdit(opt){
  const hasEdit = opt.viewEditable;
  const elBadges = opt.elBadges;
  const elBadge  = createViewBadge({
    iconClasses : ["fa", hasEdit ? "fa-unlock" : "fa-lock" ],
    tooltipClasses : ["hint--left"],
    tooltipKey : hasEdit ? "view_editable" : "view_locked"
  });
  elBadges.appendChild(elBadge);
}

/**
 * Add shared badge
 */
function addBadgeShared(opt){

  const elBadges = opt.elBadges;
  const elBadge = createViewBadge({
    iconClasses : ["fa","fa-share-alt-square"],
    tooltipClasses : ["hint--left"],
    tooltipKey : "view_shared"
  });
  elBadges.appendChild(elBadge);
}
/**
 * Evaluate diaf and add badge
 */
function addBadgeDiaf(opt){
  const h = mx.helpers;
  const view = opt.view;
  const elBadges = opt.elBadges;

  h.evaluateDiafView({
    view : view
  })
    .then( result => {
      const elStar = result.elStar;
      elBadges.appendChild(elStar);
      elStar.dataset.view_action_key = "btn_opt_diaf_modal";
      elStar.dataset.view_action_target = result.idView;
    });
}

/**
 * add a badge "public without metadata valid"
 */
function addBadgePublicNotValid(opt){

  const h = mx.helpers;
  const validation = opt.validation;
  const elBadges = opt.elBadges;
  const results = h.path(validation,'results');
  const elBadge = createViewBadge({
    iconClasses : ["mx-view-public-not-valid","fa","fa-exclamation-triangle"],
    style : {
      color : "red"
    },
    tooltipClasses : ["hint--left"],
    tooltipKey : "view_public_not_valid"
  });

  elBadge.dataset.view_action_key="btn_badge_warning_invalid_meta";
  elBadge.dataset.view_action_data=JSON.stringify(results);
  elBadges.appendChild(elBadge);

}


/*
* Display a modal window with validation results
* NOTE: see event handler in mx_helper_map_view_click.js
* @param {Object} results validation results
*/
export function displayMetadataIssuesModal(results){
  mx.helpers.getDictItem("validate_meta_title")
    .then( title => {
      mx.helpers.modal({
        id : "modal_validation_metadata",
        replace : true,
        title : title,
        content : mx.helpers.validationMetadataTestsToHTML(results)
      });
    });
}


/**
 * create a view badge
 */
function createViewBadge(opt){
  const el = mx.helpers.el;
  return el("span",
    {
      class : opt.tooltipClasses || "hint--left",
      dataset : {
        lang_type: 'tooltip',
        lang_key : opt.tooltipKey || ""
      }
    },  
    el("i",
      {
        class : opt.iconClasses || ["fa","fa-check-circle"] 
      }
    )
  );
}

