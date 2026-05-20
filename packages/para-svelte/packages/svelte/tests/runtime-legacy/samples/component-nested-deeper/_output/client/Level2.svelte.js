import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<span>TRUE! <!></span>`);
var root_2 = $.from_html(`<span>FALSE! <!></span>`);
var root = $.from_html(`<div class="level2"><h4>level 2</h4> <!></div>`);

export default function Level2($$anchor, $$props) {
	$.push($$props, false);

	let condition = $.prop($$props, 'condition', 12);

	var $$exports = {
		get condition() {
			return condition();
		},

		set condition($$value) {
			condition($$value);
			$.flush();
		}
	};

	var div = root();
	var node = $.sibling($.child(div), 2);

	{
		var consequent = ($$anchor) => {
			var span = root_1();
			var node_1 = $.sibling($.child(span));

			$.slot(node_1, $$props, 'default', {}, null);
			$.reset(span);
			$.append($$anchor, span);
		};

		var alternate = ($$anchor) => {
			var span_1 = root_2();
			var node_2 = $.sibling($.child(span_1));

			$.slot(node_2, $$props, 'default', {}, null);
			$.reset(span_1);
			$.append($$anchor, span_1);
		};

		$.if(node, ($$render) => {
			if (condition()) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}