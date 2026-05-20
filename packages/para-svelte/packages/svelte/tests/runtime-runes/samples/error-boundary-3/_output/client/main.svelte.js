import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);
var root = $.from_html(`<!> <button>+</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	function throw_error() {
		throw new Error('oh no!');
	}

	let count = $.state(0);
	var fragment = root();
	var node = $.first_child(fragment);

	{
		const failed = ($$anchor, e = $.noop) => {
			var div = root_1();
			var text = $.child(div, true);

			$.reset(div);
			$.template_effect(() => $.set_text(text, e().message));
			$.append($$anchor, div);
		};

		$.boundary(node, { onerror: (e) => console.log('error caught'), failed }, ($$anchor) => {
			$.next();

			var text_1 = $.text();

			$.template_effect(($0) => $.set_text(text_1, $0), [() => $.get(count) > 0 ? throw_error() : null]);
			$.append($$anchor, text_1);
		});
	}

	var button = $.sibling(node, 2);

	$.delegated('click', button, () => $.update(count));
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);