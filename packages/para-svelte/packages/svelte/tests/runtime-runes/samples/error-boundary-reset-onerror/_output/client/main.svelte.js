import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div>err</div>`);
var root = $.from_html(`<!> <button>trigger throw</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let must_throw = $.state(false);

	function throw_error() {
		throw new Error("error on template render");
	}

	var fragment = root();
	var node = $.first_child(fragment);

	{
		const failed = ($$anchor) => {
			var div = root_1();

			$.append($$anchor, div);
		};

		$.boundary(node, { onerror: (_, reset) => reset(), failed }, ($$anchor) => {
			$.next();

			var text = $.text();

			$.template_effect(($0) => $.set_text(text, $0), [() => $.get(must_throw) ? throw_error() : 'normal content']);
			$.append($$anchor, text);
		});
	}

	var button = $.sibling(node, 2);

	$.delegated('click', button, () => $.set(must_throw, true));
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);