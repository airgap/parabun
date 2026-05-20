import 'svelte/internal/disclose-version';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button class="btn svelte-1przr7y">btn</button>`);

const $$css = {
	hash: 'svelte-1przr7y',
	code: '.btn.svelte-1przr7y {width:123px;height:123px;}'
};

export default function _unknown_($$anchor, $$props) {
	$.push($$props, true);
	$.append_styles($$anchor, $$css);

	$.user_effect(() => {
		$$props.$$host.dispatchEvent(new CustomEvent("html", { detail: $$props.$$host.shadowRoot?.innerHTML }));
	});

	var button = root();

	$.append($$anchor, button);
	$.pop();
}

customElements.define('custom-element', $.create_custom_element(_unknown_, {}, [], [], { mode: 'open' }));