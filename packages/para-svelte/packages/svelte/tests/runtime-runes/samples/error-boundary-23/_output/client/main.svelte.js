import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div>oops!</div>`);
var root_2 = $.from_html(` <button>fail</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let fail = $.state(false);

	function error() {
		throw new Error('oops');
	}

	function attachment() {
		console.log('attachment');
	}

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		const failed = ($$anchor) => {
			var div = root_1();

			$.attach(div, () => attachment);
			$.append($$anchor, div);
		};

		$.boundary(node, { failed }, ($$anchor) => {
			$.next();

			var fragment_1 = root_2();
			var text = $.first_child(fragment_1);
			var button = $.sibling(text);

			$.template_effect(($0) => $.set_text(text, `${$0 ?? ''} `), [() => $.get(fail) ? error() : 'all good']);
			$.delegated('click', button, () => $.set(fail, true));
			$.append($$anchor, fragment_1);
		});
	}

	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);