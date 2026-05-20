import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root = $.from_html(`<button>Hide</button> <!>`, 1);

export default function Main($$anchor) {
	let active = $.mutable_source(true);
	let data = { example: 'This is some example data' };

	function log(data) {
		console.log('should fire once');

		return data;
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	{
		var consequent = ($$anchor) => {
			{
				let $0 = $.derived_safe_equal(() => ($.untrack(() => log(data))));

				Child($$anchor, {
					get data() {
						return $.get($0);
					}
				});
			}
		};

		$.if(node, ($$render) => {
			if ($.get(active)) $$render(consequent);
		});
	}

	$.event('click', button, () => $.set(active, false));
	$.append($$anchor, fragment);
}