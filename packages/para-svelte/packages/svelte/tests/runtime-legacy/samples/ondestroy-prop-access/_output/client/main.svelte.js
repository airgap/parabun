import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Component from "./Component.svelte";

var root = $.from_html(`<button></button> <button></button> <!> <!> <!> <!> <!> <!> <!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const spread = $.mutable_source();
	let show = $.mutable_source(true);
	let count = $.mutable_source(0);

	$.legacy_pre_effect(() => ($.get(show), $.get(count)), () => {
		$.set(spread, { checked: $.get(show), count: $.get(count) });
	});

	$.legacy_pre_effect_reset();

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var node = $.sibling(button_1, 2);

	{
		var consequent = ($$anchor) => {
			Component($$anchor, {
				get count() {
					return $.get(count);
				},

				set count($$value) {
					$.set(count, $$value);
				},

				get checked() {
					return $.get(show);
				},

				set checked($$value) {
					$.set(show, $$value);
				},
				$$legacy: true
			});
		};

		$.if(node, ($$render) => {
			if ($.get(count) < 2) $$render(consequent);
		});
	}

	var node_1 = $.sibling(node, 2);

	{
		var consequent_1 = ($$anchor) => {
			Component($$anchor, $.spread_props(() => $.get(spread)));
		};

		$.if(node_1, ($$render) => {
			if ($.get(count) < 2) $$render(consequent_1);
		});
	}

	var node_2 = $.sibling(node_1, 2);

	{
		var consequent_2 = ($$anchor) => {
			Component($$anchor, {
				get count() {
					return $.get(count);
				},

				get checked() {
					return $.get(show);
				}
			});
		};

		$.if(node_2, ($$render) => {
			if ($.get(count) < 2) $$render(consequent_2);
		});
	}

	var node_3 = $.sibling(node_2, 2);

	{
		var consequent_3 = ($$anchor) => {
			Component($$anchor, {
				get count() {
					return $.get(count);
				},

				get checked() {
					return $.get(show);
				}
			});
		};

		$.if(node_3, ($$render) => {
			if ($.get(show)) $$render(consequent_3);
		});
	}

	var node_4 = $.sibling(node_3, 2);

	$.component(node_4, () => $.get(count) < 2 ? Component : undefined, ($$anchor, $$component) => {
		$$component($$anchor, {
			get count() {
				return $.get(count);
			},

			get checked() {
				return $.get(show);
			}
		});
	});

	var node_5 = $.sibling(node_4, 2);

	$.component(node_5, () => $.get(count) < 2 ? Component : undefined, ($$anchor, $$component) => {
		$$component($$anchor, $.spread_props(() => $.get(spread)));
	});

	var node_6 = $.sibling(node_5, 2);

	$.component(node_6, () => $.get(show) ? Component : undefined, ($$anchor, $$component) => {
		$$component($$anchor, {
			get count() {
				return $.get(count);
			},

			get checked() {
				return $.get(show);
			}
		});
	});

	var node_7 = $.sibling(node_6, 2);

	$.component(node_7, () => $.get(show) ? Component : undefined, ($$anchor, $$component) => {
		$$component($$anchor, $.spread_props(() => $.get(spread)));
	});

	$.delegated('click', button, () => $.update(count));
	$.delegated('click', button_1, () => $.set(show, !$.get(show)));
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);