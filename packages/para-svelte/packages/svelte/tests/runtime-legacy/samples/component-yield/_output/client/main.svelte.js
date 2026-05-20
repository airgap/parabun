import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p>Hello <!></p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let test = $.prop($$props, 'test', 12, true);

	var $$exports = {
		get test() {
			return test();
		},

		set test($$value) {
			test($$value);
			$.flush();
		}
	};

	var p = root();
	var node = $.sibling($.child(p));

	{
		var consequent = ($$anchor) => {
			var fragment = $.comment();
			var node_1 = $.first_child(fragment);

			$.slot(node_1, $$props, 'default', {}, null);
			$.append($$anchor, fragment);
		};

		$.if(node, ($$render) => {
			if (test()) $$render(consequent);
		});
	}

	$.reset(p);
	$.append($$anchor, p);

	return $.pop($$exports);
}