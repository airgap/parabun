import 'svelte/internal/disclose-version';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button><!></button>`);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, true);

	var button = root();
	var node = $.child(button);

	$.slot(node, $$props, 'default', {}, null);
	$.reset(button);

	$.delegated('click', button, (e) => {
		$$props.$$host.callback();
	});

	$.append($$anchor, button);
	$.pop();
}

$.delegate(['click']);
customElements.define('custom-element', $.create_custom_element(_unknown_, {}, ['default'], [], { mode: 'open' }));