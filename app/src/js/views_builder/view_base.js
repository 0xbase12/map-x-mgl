import {checkLanguage} from '../mx_helper_language.js';
import {el} from '@fxi/el';

class ViewBase {
  constructor(view) {
    let vb = this;
    vb.view = view;
    vb.build();
  }
  build() {
    build.bind(this)();
  }
  getEl() {
    return this.el;
  }
  isOpen() {
    return this.elInput.checked === true;
  }
  click() {
    var evt = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    this.elInput.dispatchEvent(evt);
  }
  open() {
    if (!this.isOpen()) {
      this.click();
    }
  }
  close() {
    if (this.isOpen()) {
      this.click();
    }
  }
  destroy() {
    let elParent = this.el.parentElement;
    if (elParent) {
      elParent.removeChild(this.el);
    }
  }
}

export {ViewBase};

function build() {
  let vb = this;
  let view = vb.view;
  let lang = checkLanguage({obj: view, path: 'data.title'});

  let title = view.data.title
    ? view.data.title[lang]
    : 'Undefined'; /**
  
  /*
   * Chrome does not render at all svg produced with 'el';
   */
  let elButton = `<svg class='mx-view-tgl-btn' viewBox='0 0 30 30' width='30px' height='30px' preserveAspectRatio='xMinYMin meet'>
       <circle class='mx-view-tgl-btn-out' r=15 cx=15 cy=15></circle>
       <circle class='mx-view-tgl-btn-in' r=13 cx=15 cy=15></circle>
      </svg>`;

  let elTitle = el('span', {class: 'mx-view-tgl-title'}, title);

  let elBadges = el('div', {
    id: 'view_badges_' + view.id
  });

  let elClasses = el(
    'span',
    {
      class: 'mx-view-item-classes'
    },
    view.data.classes,
    view.type
  );
  let elIndex = el('span', {
    class: 'mx-view-item-index'
  });
  let elToggleMore = el(
    'div',
    {
      class: 'mx-view-tgl-more-container'
    },
    el('div', {
      class: 'mx-view-tgl-more',
      dataset: {
        view_options_for: view.id
      }
    })
  );

  let elInput = el('input', {
    id: 'check_view_enable_' + view.id,
    class: 'mx-view-tgl-input',
    type: 'checkbox',
    dataset: {
      view_action_key: 'btn_toggle_view',
      view_action_target: view.id
    }
  });

  let elLabel = el(
    'label',
    {
      class: 'mx-view-tgl-content',
      for: 'check_view_enable_' + view.id
    },
    elButton,
    elTitle,
    elBadges,
    elClasses,
    elIndex
  );

  let elView = el(
    'div',
    {
      dataset: {
        view_id: view.id,
        view_date_modified: view.date_modified,
        view_title: title
      },
      class: [
        'mx-view-item',
        'mx-view-item-' + view.type,
        'noselect',
        'transparent'
      ]
    },
    elInput,
    elLabel,
    elToggleMore
  );
  vb.el = elView;
  vb.elInput = elInput;
  vb.elToggleMore = elToggleMore;
  vb.el.vb = this;
}
